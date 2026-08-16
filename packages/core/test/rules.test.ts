import { describe, expect, it } from 'vitest';
import {
  classifyComponent,
  classifyRoute,
  type ComponentSignals,
  type RouteSignals,
} from '../src/rules';

// ── Component-level ─────────────────────────────────────────────────────

const allClean: ComponentSignals = {
  hasHostEventHandlers: 'no',
  usesStateOrLifecycleHooks: 'no',
  usesRefForDomOrImperativeApi: 'no',
  usesBrowserGlobals: 'no',
  requiresClientOnlyDependency: 'no',
  consumesClientContext: 'no',
};

describe('classifyComponent', () => {
  it('recommends server when every signal is clean', () => {
    const verdict = classifyComponent(allClean);
    expect(verdict.renderTarget).toBe('server');
    expect(verdict.confidence).toBe('high');
    expect(verdict.reasons[0]).toMatch(/No client-requiring signal found/);
  });

  const triggers: Array<keyof ComponentSignals> = [
    'hasHostEventHandlers',
    'usesStateOrLifecycleHooks',
    'usesRefForDomOrImperativeApi',
    'usesBrowserGlobals',
    'requiresClientOnlyDependency',
    'consumesClientContext',
  ];

  it.each(triggers)('recommends client, high confidence, when %s is yes', (trigger) => {
    const verdict = classifyComponent({ ...allClean, [trigger]: 'yes' });
    expect(verdict.renderTarget).toBe('client');
    expect(verdict.confidence).toBe('high');
    expect(verdict.reasons).toHaveLength(1);
  });

  it.each(triggers)('defaults to client, LOW confidence, when only %s is unknown', (trigger) => {
    const verdict = classifyComponent({ ...allClean, [trigger]: 'unknown' });
    expect(verdict.renderTarget).toBe('client');
    expect(verdict.confidence).toBe('low');
    expect(verdict.reasons.join(' ')).toMatch(/unresolved/);
  });

  it('a definite "yes" wins over other unresolved signals (stays high confidence)', () => {
    const verdict = classifyComponent({
      ...allClean,
      usesStateOrLifecycleHooks: 'yes',
      usesBrowserGlobals: 'unknown',
    });
    expect(verdict.renderTarget).toBe('client');
    expect(verdict.confidence).toBe('high');
    expect(verdict.reasons).toHaveLength(1);
  });

  it('collects a reason per definite trigger when multiple fire at once', () => {
    const verdict = classifyComponent({
      ...allClean,
      hasHostEventHandlers: 'yes',
      usesBrowserGlobals: 'yes',
    });
    expect(verdict.reasons).toHaveLength(2);
  });

  it('lists every unresolved signal when more than one is unknown', () => {
    const verdict = classifyComponent({
      ...allClean,
      usesRefForDomOrImperativeApi: 'unknown',
      consumesClientContext: 'unknown',
    });
    expect(verdict.confidence).toBe('low');
    expect(verdict.reasons[0]).toMatch(/DOM refs \/ imperative APIs/);
    expect(verdict.reasons[0]).toMatch(/client Context usage/);
  });

  it('suggests extracting a leaf component when the only trigger is host event handlers', () => {
    const verdict = classifyComponent({ ...allClean, hasHostEventHandlers: 'yes' });
    expect(verdict.suggestions.join(' ')).toMatch(/extract/i);
  });

  it('suggests a <Providers> wrapper when the only trigger is client Context', () => {
    const verdict = classifyComponent({ ...allClean, consumesClientContext: 'yes' });
    expect(verdict.suggestions.join(' ')).toMatch(/<Providers>/);
  });

  it('flags the dependency itself when requiresClientOnlyDependency is the trigger', () => {
    const verdict = classifyComponent({ ...allClean, requiresClientOnlyDependency: 'yes' });
    expect(verdict.suggestions.join(' ')).toMatch(/dependency/);
  });

  it('gives no suggestions for the clean server case', () => {
    expect(classifyComponent(allClean).suggestions).toHaveLength(0);
  });
});

// ── Route-level ──────────────────────────────────────────────────────────

const routeClean: RouteSignals = {
  readsRequestTimeDataOnServer: 'no',
  hasUnsuspendedClientSearchParams: 'no',
  dataChangeFrequency: 'never',
  isDynamicRouteSegment: 'no',
  knownParamsAtBuildTime: 'no',
};

describe('classifyRoute', () => {
  it('is dynamic, high confidence, when server code reads request-time data', () => {
    const verdict = classifyRoute({ ...routeClean, readsRequestTimeDataOnServer: 'yes' });
    expect(verdict.generation).toBe('dynamic');
    expect(verdict.confidence).toBe('high');
  });

  it('flags that the request-time read affects the whole route segment, not just the call site', () => {
    const verdict = classifyRoute({ ...routeClean, readsRequestTimeDataOnServer: 'yes' });
    expect(verdict.suggestions.join(' ')).toMatch(/route segment/);
  });

  it('is dynamic when useSearchParams() is unsuspended, even with no other blocker', () => {
    const verdict = classifyRoute({ ...routeClean, hasUnsuspendedClientSearchParams: 'yes' });
    expect(verdict.generation).toBe('dynamic');
    expect(verdict.confidence).toBe('high');
    expect(verdict.suggestions.join(' ')).toMatch(/<Suspense>/);
  });

  it('does not conflate an unsuspended searchParams read with a generic server-data reason', () => {
    const verdict = classifyRoute({ ...routeClean, hasUnsuspendedClientSearchParams: 'yes' });
    expect(verdict.reasons[0]).toMatch(/useSearchParams/);
  });

  it('makes clear the unsuspended searchParams case breaks the build, not just a per-request render choice', () => {
    const verdict = classifyRoute({ ...routeClean, hasUnsuspendedClientSearchParams: 'yes' });
    expect(verdict.reasons[0]).toMatch(/next build/);
  });

  const routeBlockers: Array<'readsRequestTimeDataOnServer' | 'hasUnsuspendedClientSearchParams'> = [
    'readsRequestTimeDataOnServer',
    'hasUnsuspendedClientSearchParams',
  ];

  it.each(routeBlockers)('defaults to dynamic, LOW confidence, when %s is unknown', (key) => {
    const verdict = classifyRoute({ ...routeClean, [key]: 'unknown' });
    expect(verdict.generation).toBe('dynamic');
    expect(verdict.confidence).toBe('low');
  });

  it('lists both blockers when both are unknown', () => {
    const verdict = classifyRoute({
      ...routeClean,
      readsRequestTimeDataOnServer: 'unknown',
      hasUnsuspendedClientSearchParams: 'unknown',
    });
    expect(verdict.reasons[0]).toMatch(/readsRequestTimeDataOnServer/);
    expect(verdict.reasons[0]).toMatch(/hasUnsuspendedClientSearchParams/);
  });

  it('is static, high confidence, when clean and data never changes', () => {
    const verdict = classifyRoute(routeClean);
    expect(verdict.generation).toBe('static');
    expect(verdict.confidence).toBe('high');
  });

  it('is ISR, high confidence, with a ready snippet when revalidateSeconds is given', () => {
    const verdict = classifyRoute({
      ...routeClean,
      dataChangeFrequency: 'periodically',
      revalidateSeconds: 3600,
    });
    expect(verdict.generation).toBe('isr');
    expect(verdict.confidence).toBe('high');
    expect(verdict.suggestions).toContain('export const revalidate = 3600;');
  });

  it('is ISR, medium confidence, when periodic but no revalidateSeconds given', () => {
    const verdict = classifyRoute({ ...routeClean, dataChangeFrequency: 'periodically' });
    expect(verdict.generation).toBe('isr');
    expect(verdict.confidence).toBe('medium');
  });

  const unusableRevalidateSeconds = [0, -1, NaN, Infinity, -Infinity, 1.5];

  it.each(unusableRevalidateSeconds)(
    'is ISR, medium confidence, with the generic prompt (not a snippet) when revalidateSeconds is %p',
    (revalidateSeconds) => {
      const verdict = classifyRoute({
        ...routeClean,
        dataChangeFrequency: 'periodically',
        revalidateSeconds,
      });
      expect(verdict.generation).toBe('isr');
      expect(verdict.confidence).toBe('medium');
      expect(verdict.suggestions).toEqual([
        'Pick a revalidate interval (in seconds) matching how often the data actually changes.',
      ]);
    },
  );

  it('is dynamic, high confidence, when data changes every request', () => {
    const verdict = classifyRoute({ ...routeClean, dataChangeFrequency: 'every-request' });
    expect(verdict.generation).toBe('dynamic');
    expect(verdict.confidence).toBe('high');
  });

  it('is dynamic, LOW confidence, when data change frequency is unknown', () => {
    const verdict = classifyRoute({ ...routeClean, dataChangeFrequency: 'unknown' });
    expect(verdict.generation).toBe('dynamic');
    expect(verdict.confidence).toBe('low');
  });

  it('suggests generateStaticParams for a [param] route with known params that ends up static', () => {
    const verdict = classifyRoute({
      ...routeClean,
      isDynamicRouteSegment: 'yes',
      knownParamsAtBuildTime: 'yes',
    });
    expect(verdict.generation).toBe('static');
    expect(verdict.suggestions.join(' ')).toMatch(/generateStaticParams/);
  });

  it('does not suggest generateStaticParams when the route is already dynamic', () => {
    const verdict = classifyRoute({
      ...routeClean,
      isDynamicRouteSegment: 'yes',
      knownParamsAtBuildTime: 'yes',
      readsRequestTimeDataOnServer: 'yes',
    });
    expect(verdict.suggestions.join(' ')).not.toMatch(/generateStaticParams/);
  });

  it('does not suggest generateStaticParams for a non-dynamic route segment', () => {
    const verdict = classifyRoute({ ...routeClean, knownParamsAtBuildTime: 'yes' });
    expect(verdict.suggestions.join(' ')).not.toMatch(/generateStaticParams/);
  });
});
