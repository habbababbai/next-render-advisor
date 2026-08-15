# CLAUDE.md

Guidance for Claude working on this repository.

## What this is

**`next-render-advisor`** — a CLI recommending Server vs Client Component and Static vs ISR vs Dynamic generation for Next.js **App Router** projects.

**Current phase:** Classification logic complete and 100% tested. Next: wizard UI and CLI.

## Architecture

**Decision flow:** signals (from code or user answers) → `classifyComponent()` / `classifyRoute()` → verdict

| Component | Status | Purpose |
|-----------|--------|---------|
| `packages/core/src/rules.ts` | ✅ Done | Pure classification logic — no I/O, no framework |
| `packages/core/test/rules.test.ts` | ✅ Done | 100% branch coverage, table-driven tests |
| `wizard.ts` | 📋 Planned | Interactive Q&A for new components (package TBD) |
| `packages/cli/src/cli.ts` | 📋 Planned | Command-line interface |
| `scanner.ts` | 📋 Phase 2 | AST-based audit of existing code (package TBD) |

## Hard invariants — non-negotiable

1. **`rules.ts` is pure:** No I/O, no `console.*`, no Node built-ins (`fs`, `path`, `http`, etc.), no framework imports (Next.js, React). Plain TS/JS language built-ins only. All UI/wizard/scanner logic lives elsewhere and calls into `rules.ts`.

2. **Component and route classification are separate functions:** `classifyComponent()` and `classifyRoute()` have different input types and should never be merged. A field in one must never depend on the other.

3. **`Signal = 'yes' | 'no' | 'unknown'` — never coerce:** Don't treat `'unknown'` as falsy or reduce it to boolean. This type matters for decisions.

4. **Uncertainty defaults are asymmetric by design:**
   - **Component unresolved** → recommend `'client'` (cheap to be wrong; Next.js backstops the opposite)
   - **Route unresolved** → recommend `'dynamic'` (guessing static wrong risks stale/leaked content)
   - This is intentional risk management, not a default to average or configure.

5. **App Router only:** No Pages Router branching in `rules.ts`.

6. **Local distribution for now:** Do not publish to npm or add CI publish automation without explicit ask.

## Testing requirements

`packages/core/src/rules.ts` has 100% branch coverage. Any change needs accompanying tests in `packages/core/test/rules.test.ts` covering all branches, including `'unknown'` cases.

```bash
vitest run --coverage  # Check coverage
```

## Review criteria

Used by `/code-review` locally. CI already covers lint, tests, and coverage —
don't re-report those.

**Blocking.** Any of these gets `--request-changes`:

- Breaks one of the hard invariants above. Purity of `rules.ts` and the
  `'unknown'`-is-not-falsy rule are the two most likely to be violated silently.
- Changes an asymmetric default (component → `'client'`, route → `'dynamic'`)
  without the PR explicitly saying it's doing so.
- Changes classification behavior with no matching case added to
  `packages/core/test/rules.test.ts`, or drops a branch below 100% coverage.
- Merges component and route logic, or makes a field in one depend on the other.
- Adds Pages Router branching to `rules.ts`.
- Adds npm publish steps or CI publish automation (invariant 6).

**Non-blocking.** Mention at most briefly, never block on:

- Formatting, naming, and import order — Prettier and ESLint own these.
- Speculative abstraction for planned-but-unbuilt work (`wizard.ts`, `scanner.ts`).
- Test style preferences, as long as the branches are covered.

**Verification bar.** Cite `file:line` for behavior claims. Don't infer what a
function does from its name — read it.

## Claude Code Setup

MCP servers available to you in this project:

- **GitHub MCP** — Search repos, open issues/PRs, access GitHub API. Authenticates
  via the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable, not `gh`'s stored
  credentials — see the README's Claude Code Setup section for one-time setup.

Configured in `.claude/settings.json`.

## Before you work

- Read `packages/core/src/rules.ts` to understand the decision logic
- Read `packages/core/test/rules.test.ts` to see expected behavior and edge cases
- Check what's in `package.json` (monorepo? pnpm workspaces?) before suggesting folder layout
- Don't create or modify `package.json` / `tsconfig.json` unless asked — owner sets up scaffolding manually

## Style

- Match comment density in `rules.ts` — explain *why*, not what; keep terse
- Don't invent features; follow existing patterns
- Use signals as first-class, not boolean conversions
