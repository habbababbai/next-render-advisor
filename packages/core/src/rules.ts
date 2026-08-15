/**
 * Pure classification core — no I/O, no framework dependency. Both the
 * interactive wizard (Phase 1) and the future AST scanner (Phase 2) produce
 * the same Signal types and feed them through these functions, so the two
 * never give contradictory advice. See PLAN.md for the full rationale.
 *
 * Two independent axes, deliberately kept as separate functions rather than
 * fields on one object — a Client Component and a static route are not in
 * tension with each other, and merging the two types would make it possible
 * to (incorrectly) let one influence the other.
 *   - classifyComponent: should THIS component be server or client?
 *   - classifyRoute:     what generation strategy should THIS route use?
 */

/**
 * 'unknown' is a first-class answer, not an absence of one. The wizard can
 * offer "Not sure" for a hard question; the scanner can report "this import
 * couldn't be resolved." classify() never treats 'unknown' as an implicit
 * 'no' — see the asymmetry note in PLAN.md: guessing wrong toward "needs
 * client" / "stays dynamic" is cheap, guessing wrong the other way can ship
 * a real bug (or serve stale/leaked content) with no other safety net.
 */
export type Signal = 'yes' | 'no' | 'unknown';

export type Confidence = 'high' | 'medium' | 'low';

// ── Component-level: does THIS component need 'use client'? ───────────────

export interface ComponentSignals {
  /** Event handlers (onClick, onChange, ...) wired to a real DOM element —
   *  not a same-named prop merely forwarded into a child component. */
  hasHostEventHandlers: Signal;
  /** useState / useEffect / useReducer / useLayoutEffect / similar. */
  usesStateOrLifecycleHooks: Signal;
  /** useRef targeting a DOM node, or any other imperative DOM API. */
  usesRefForDomOrImperativeApi: Signal;
  /** window / document / localStorage / navigator / geolocation, etc. —
   *  including module-scope references, not just inside hooks or effects. */
  usesBrowserGlobals: Signal;
  /** A dependency that is itself client-only: a resolved import carrying its
   *  own 'use client', or the component being wrapped in
   *  next/dynamic(..., { ssr: false }). */
  requiresClientOnlyDependency: Signal;
  /** useContext (or equivalent) on a value that only changes client-side. */
  consumesClientContext: Signal;
}

export interface ComponentVerdict {
  renderTarget: 'server' | 'client';
  confidence: Confidence;
  reasons: string[];
  suggestions: string[];
}

interface ClientTrigger {
  key: keyof ComponentSignals;
  label: string;
  reason: string;
}

const CLIENT_TRIGGERS: ClientTrigger[] = [
  {
    key: 'hasHostEventHandlers',
    label: 'event handlers on host elements',
    reason:
      'Has an event handler wired to a DOM element (e.g. onClick) — needs a client boundary to run in the browser.',
  },
  {
    key: 'usesStateOrLifecycleHooks',
    label: 'state/lifecycle hooks',
    reason:
      'Uses React state or lifecycle hooks (useState/useEffect/useReducer/...) — these only run in Client Components.',
  },
  {
    key: 'usesRefForDomOrImperativeApi',
    label: 'DOM refs / imperative APIs',
    reason:
      'Uses a ref against a real DOM node or another imperative API — requires the browser.',
  },
  {
    key: 'usesBrowserGlobals',
    label: 'browser globals',
    reason:
      'References a browser-only global (window/document/localStorage/...) — this crashes when rendered on the server.',
  },
  {
    key: 'requiresClientOnlyDependency',
    label: 'client-only dependency',
    reason:
      "Depends on something that is itself client-only (a library shipping its own 'use client', or wrapped in next/dynamic(ssr:false)).",
  },
  {
    key: 'consumesClientContext',
    label: 'client Context usage',
    reason: 'Reads a Context value that only changes on the client.',
  },
];

export function classifyComponent(signals: ComponentSignals): ComponentVerdict {
  const definite = CLIENT_TRIGGERS.filter((t) => signals[t.key] === 'yes');
  if (definite.length > 0) {
    return {
      renderTarget: 'client',
      confidence: 'high',
      reasons: definite.map((t) => t.reason),
      suggestions: buildClientSuggestions(signals, definite),
    };
  }

  const uncertain = CLIENT_TRIGGERS.filter((t) => signals[t.key] === 'unknown');
  if (uncertain.length > 0) {
    const labels = uncertain.map((t) => t.label).join(', ');
    return {
      renderTarget: 'client',
      confidence: 'low',
      reasons: [
        `Defaulting to Client Component because ${uncertain.length === 1 ? 'this is' : 'these are'} unresolved: ${labels}.`,
        "Guessing 'server' on incomplete information risks shipping a broken component with no other safety net — verify manually and remove 'use client' if it turns out unnecessary.",
      ],
      suggestions: [`Resolve: ${labels}, then re-run for a high-confidence verdict.`],
    };
  }

  return {
    renderTarget: 'server',
    confidence: 'high',
    reasons: [
      `No client-requiring signal found. Checked: ${CLIENT_TRIGGERS.map((t) => t.label).join(', ')}.`,
    ],
    suggestions: [],
  };
}

function buildClientSuggestions(
  signals: ComponentSignals,
  definite: ClientTrigger[],
): string[] {
  const suggestions: string[] = [];
  const onlyTrigger = definite.length === 1 ? definite[0].key : null;

  if (
    onlyTrigger === 'hasHostEventHandlers' ||
    onlyTrigger === 'usesStateOrLifecycleHooks' ||
    onlyTrigger === 'usesRefForDomOrImperativeApi'
  ) {
    suggestions.push(
      'If only part of this component needs interactivity, extract just that part into its own small Client Component and keep the rest server-rendered — avoids dragging the whole subtree into the client bundle.',
    );
  }

  if (onlyTrigger === 'consumesClientContext') {
    suggestions.push(
      'Consider a dedicated <Providers> client wrapper around {children} instead of marking this whole component client.',
    );
  }

  if (signals.requiresClientOnlyDependency === 'yes') {
    suggestions.push(
      "The client requirement here comes from a dependency, not this component's own code — worth checking whether a lighter alternative exists.",
    );
  }

  return suggestions;
}

// ── Route-level: what generation strategy should THIS route segment use? ──

export interface RouteSignals {
  /** cookies()/headers()/searchParams read anywhere in the route's SERVER
   *  tree, or an uncached fetch, or export const dynamic = 'force-dynamic'.
   *  Does NOT include a client descendant's own hook usage — see
   *  hasUnsuspendedClientSearchParams below for that narrower case. */
  readsRequestTimeDataOnServer: Signal;
  /** useSearchParams() in a client descendant with no ancestor <Suspense>.
   *  A named, documented Next.js rule that blocks static rendering even
   *  though the read happens inside a Client Component — kept as its own
   *  signal so the reason given is specific, not lumped into "dynamic". */
  hasUnsuspendedClientSearchParams: Signal;
  /** How often the underlying data changes, evaluated only once neither
   *  signal above already forces dynamic rendering. */
  dataChangeFrequency: 'never' | 'periodically' | 'every-request' | 'unknown';
  /** Only meaningful when dataChangeFrequency === 'periodically' — used to
   *  suggest an exact `revalidate` value. */
  revalidateSeconds?: number;
  /** Is this route a [param] / [...param] segment? */
  isDynamicRouteSegment: Signal;
  /** Only meaningful when isDynamicRouteSegment === 'yes' — is the full set
   *  of params enumerable ahead of time (candidate for
   *  generateStaticParams)? */
  knownParamsAtBuildTime: Signal;
}

export interface RouteVerdict {
  generation: 'static' | 'isr' | 'dynamic';
  confidence: Confidence;
  reasons: string[];
  suggestions: string[];
}

export function classifyRoute(signals: RouteSignals): RouteVerdict {
  // Ground-truth blockers first — unambiguous, no inference involved.
  if (signals.readsRequestTimeDataOnServer === 'yes') {
    return {
      generation: 'dynamic',
      confidence: 'high',
      reasons: [
        "Reads request-time data on the server (cookies()/headers()/searchParams, an uncached fetch, or export const dynamic = 'force-dynamic') — this route cannot be fully prerendered.",
      ],
      suggestions: [
        'This opts out the whole route segment, not just the call site — worth knowing before reaching for cookies()/headers() in a component that otherwise looks static-eligible.',
      ],
    };
  }

  if (signals.hasUnsuspendedClientSearchParams === 'yes') {
    return {
      generation: 'dynamic',
      confidence: 'high',
      reasons: [
        'A Client Component calls useSearchParams() without an ancestor <Suspense> boundary — this specifically opts the route out of static rendering, even though the rest of the tree may be static-eligible.',
      ],
      suggestions: [
        'Wrap the component that calls useSearchParams() in a <Suspense> boundary to restore static eligibility for the rest of the route.',
      ],
    };
  }

  const uncertainBlockers: string[] = [];
  if (signals.readsRequestTimeDataOnServer === 'unknown') {
    uncertainBlockers.push('readsRequestTimeDataOnServer');
  }
  if (signals.hasUnsuspendedClientSearchParams === 'unknown') {
    uncertainBlockers.push('hasUnsuspendedClientSearchParams');
  }

  if (uncertainBlockers.length > 0) {
    const list = uncertainBlockers.join(', ');
    return {
      generation: 'dynamic',
      confidence: 'low',
      reasons: [
        `Defaulting to dynamic rendering because unresolved: ${list}.`,
        'Guessing static on incomplete information risks caching content that should have been per-request — a worse failure than an unnecessary dynamic render.',
      ],
      suggestions: [`Resolve: ${list}, then re-run for a high-confidence verdict.`],
    };
  }

  // No server-side blocker — decide static vs ISR from data freshness.
  const verdict = classifyByDataFreshness(signals);

  if (
    signals.isDynamicRouteSegment === 'yes' &&
    signals.knownParamsAtBuildTime === 'yes' &&
    verdict.generation !== 'dynamic'
  ) {
    verdict.suggestions.push(
      'This is a [param] route with a knowable param set — add generateStaticParams to prerender all of them at build time.',
    );
  }

  return verdict;
}

function classifyByDataFreshness(signals: RouteSignals): RouteVerdict {
  switch (signals.dataChangeFrequency) {
    case 'never':
      return {
        generation: 'static',
        confidence: 'high',
        reasons: [
          'No request-time data access, and the underlying data never changes after build — fully static.',
        ],
        suggestions: [],
      };

    case 'periodically': {
      const seconds = signals.revalidateSeconds;
      return {
        generation: 'isr',
        confidence: seconds ? 'high' : 'medium',
        reasons: [
          'No request-time data access, but the underlying data changes periodically — ISR is cheaper than full dynamic rendering and fresher than pure static.',
        ],
        suggestions: seconds
          ? [`export const revalidate = ${seconds};`]
          : ['Pick a revalidate interval (in seconds) matching how often the data actually changes.'],
      };
    }

    case 'every-request':
      return {
        generation: 'dynamic',
        confidence: 'high',
        reasons: [
          'Data changes on every request — even without reading request-time data directly, caching it would serve stale content.',
        ],
        suggestions: [],
      };

    case 'unknown':
    default:
      return {
        generation: 'dynamic',
        confidence: 'low',
        reasons: [
          "Data change frequency wasn't determined — defaulting to dynamic rather than risking stale cached content.",
        ],
        suggestions: ['Determine how often the underlying data changes to get a high-confidence static/ISR verdict.'],
      };
  }
}
