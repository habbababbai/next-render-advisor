# CLAUDE.md

Guidance for Claude working on this repository.

## What this is

**`next-render-advisor`** — a CLI recommending Server vs Client Component and Static vs ISR vs Dynamic generation for Next.js **App Router** projects.

**Current phase:** Classification logic complete and 100% tested. Next: wizard UI and CLI.

## Architecture

**Decision flow:** signals (from code or user answers) → `classifyComponent()` / `classifyRoute()` → verdict

| Component | Status | Purpose |
|-----------|--------|---------|
| `src/rules.ts` | ✅ Done | Pure classification logic — no I/O, no framework |
| `test/rules.test.ts` | ✅ Done | 100% branch coverage, table-driven tests |
| `src/wizard.ts` | 📋 Planned | Interactive Q&A for new components |
| `src/cli.ts` | 📋 Planned | Command-line interface |
| `src/scanner.ts` | 📋 Phase 2 | AST-based audit of existing code |

## Hard invariants — non-negotiable

1. **`src/rules.ts` is pure:** No I/O, no `console.*`, no framework imports outside stdlib/TS types. All UI/wizard/scanner logic lives elsewhere and calls into `rules.ts`.

2. **Component and route classification are separate functions:** `classifyComponent()` and `classifyRoute()` have different input types and should never be merged. A field in one must never depend on the other.

3. **`Signal = 'yes' | 'no' | 'unknown'` — never coerce:** Don't treat `'unknown'` as falsy or reduce it to boolean. This type matters for decisions.

4. **Uncertainty defaults are asymmetric by design:**
   - **Component unresolved** → recommend `'client'` (cheap to be wrong; Next.js backstops the opposite)
   - **Route unresolved** → recommend `'dynamic'` (guessing static wrong risks stale/leaked content)
   - This is intentional risk management, not a default to average or configure.

5. **App Router only:** No Pages Router branching in `rules.ts`.

6. **Local distribution for now:** Do not publish to npm or add CI publish automation without explicit ask.

## Testing requirements

`src/rules.ts` has 100% branch coverage. Any change needs accompanying tests in `test/rules.test.ts` covering all branches, including `'unknown'` cases.

```bash
vitest run --coverage  # Check coverage
```

## Claude Code Setup

MCP servers available to you in this project:

- **GitHub MCP** — Search repos, open issues/PRs, access GitHub API (uses your `gh` CLI auth)
- **npm MCP** — Search packages, get package info (for dependency decisions)

Configured in `.claude/settings.json`.

## Before you work

- Read `src/rules.ts` to understand the decision logic
- Read `test/rules.test.ts` to see expected behavior and edge cases
- Check what's in `package.json` (monorepo? pnpm workspaces?) before suggesting folder layout
- Don't create or modify `package.json` / `tsconfig.json` unless asked — owner sets up scaffolding manually

## Style

- Match comment density in `src/rules.ts` — explain *why*, not what; keep terse
- Don't invent features; follow existing patterns
- Use signals as first-class, not boolean conversions
