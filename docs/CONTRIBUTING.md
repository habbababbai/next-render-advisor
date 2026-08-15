# Contributing to next-render-advisor

## Setup

Requires Node ≥ 18 and pnpm.

```bash
pnpm install
pnpm test          # vitest run
pnpm test:coverage # vitest run --coverage
pnpm lint
pnpm format
```

## Workflow

1. Branch off `main`. No direct commits to `main` — it's protected (see
   below).
2. Commit using [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
   (`feat:`, `fix:`, `chore:`, `docs:`, etc.).
3. Open a PR against `main`. Fill in [the PR template](../.github/pull_request_template.md).
4. Get it reviewed and approved — see docs/CODERABBIT.md for how CodeRabbit
   fits into this and the exact commands to trigger it.
5. Squash-merge once approved and checks are green.

## Naming conventions

**Branches:** `<type>/<milestone-or-scope>-<short-description>`, where
`<type>` matches the Conventional Commit type of the work — e.g.
`feat/milestone-2-wizard`, `fix/ci-pnpm-version`,
`chore/dependabot-group-updates`. Dependabot names its own branches
(`dependabot/npm_and_yarn/...`, `dependabot/github_actions/...`) — leave
those as-is.

**PR titles:** Conventional Commits (`type(scope): description`) — this
becomes the squash-merge commit message, so it's what shows up in `git log`.
Prefix with `[#N]` when the PR is the primary implementation of a tracked
issue, e.g. `[#9] chore: add CI workflow, Dependabot, and CodeRabbit
config`. Plain `type(scope): description` (no `#N` prefix) is fine for
smaller PRs not tied to a milestone issue.

**Issue titles:** see [docs/ISSUES.md](./ISSUES.md).

## CI, CodeQL & Dependabot

- **CI** — [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), one
  `test` job (install, lint, `test:coverage`). This is the required status
  check on `main` (see below).
- **CodeQL** — *not* a checked-in workflow file. It runs via GitHub's
  repo-level "default setup" (Settings → Code security → Code scanning),
  covering `actions`/`javascript-typescript` on a weekly schedule plus
  relevant pushes. Because it's schedule-driven rather than guaranteed on
  every PR, it is **not** wired in as a required status check — if you
  want to make it one, confirm first that it actually attaches a check run
  to every PR, otherwise merges could hang waiting on a check that never
  runs.
- **Dependabot** — [`.github/dependabot.yml`](../.github/dependabot.yml),
  two ecosystems (`npm`, `github-actions`), weekly, each grouped into a
  single PR (`patterns: ["*"]`) instead of one PR per dependency. Separately,
  Dependabot **security updates** are enabled repo-wide (Settings → Code
  security) — those bypass the weekly schedule and grouping to open a PR
  immediately when a vulnerable dependency is detected.
- **Secret scanning** is enabled repo-wide; push protection is currently
  off.

## Branch protection on `main`

Enforced by a repository ruleset, not editable without repo admin:

| Rule | Setting |
|---|---|
| Approving reviews required | 1 (self-approval is impossible on GitHub regardless) |
| Review re-approval on push | Stale approvals dismissed; last push must be approved |
| Review threads | Must be resolved before merge |
| Status checks | `test` (lint + coverage) must pass |
| Merge method | Squash only |
| History | Linear (no merge commits); no force-push, no branch deletion |
| Bypass | Nobody, including admins |

Who reviews what: CodeRabbit reviews and approves your own PRs (see
[docs/CODERABBIT.md](./CODERABBIT.md) for the trigger commands and flow);
you personally review everyone else's (e.g. Dependabot's).

## Testing requirements

`packages/core/src/rules.ts` is held to **100% branch coverage** — any
change to it needs matching test changes in
`packages/core/test/rules.test.ts`, including `'unknown'` `Signal` cases.
`pnpm test:coverage` checks this.

## Code style and invariants

Read [`CLAUDE.md`](../CLAUDE.md) first — it has the hard invariants
(`rules.ts` stays pure, `classifyComponent`/`classifyRoute` never merge,
`Signal` is never coerced to boolean, uncertainty defaults are intentionally
asymmetric) and the comment/style conventions this repo follows.
