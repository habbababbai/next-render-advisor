# Issue Guide

## Template

Every issue uses [`.github/ISSUE_TEMPLATE/feature.md`](../.github/ISSUE_TEMPLATE/feature.md):

- **Overview** — what and why, one or two sentences.
- **Acceptance Criteria** — outcome-focused ("what does done look like"),
  not a list of implementation steps.
- **Background & Context** — why this is needed, links to related
  issues/docs/decisions.
- **Implementation Notes** — known constraints, dependencies, technical
  considerations.
- **Definition of Done** — code reviewed & merged, acceptance criteria met,
  tests added, docs updated, issue closed by the merging commit/PR.
- Footer: **Milestone**, **Priority**, **Related** (`#N` links).

## Title convention

`[Phase N] Milestone Name — Subject`, e.g. `[Phase 1] Rules Engine — Core
Classification Logic`. Follow-up/fix issues that aren't a milestone itself
still keep the `[Phase N]` prefix, e.g. `[Phase 1] Fix CI workflow and
outstanding CodeRabbit findings`.

## Labels

| Group | Labels | Meaning |
|---|---|---|
| Scope | `scope/infrastructure`, `scope/rules-engine`, `scope/wizard`, `scope/output`, `scope/cli`, `scope/integration`, `scope/publish-readiness` | Which part of the codebase |
| Phase | `phase-1`, `phase-2` | Interactive advisor (now) vs. repo scanner (deferred) |
| Milestone | `milestone-0` … `milestone-6` | Build order within Phase 1 |
| Status | `status/planning`, `status/in-progress`, `status/review`, `status/blocked` | Where it stands |
| Type | `type/setup`, `type/feature` | Infra/config vs. new functionality |

Plus GitHub's defaults (`bug`, `enhancement`, `documentation`, `good first
issue`, …) where they fit, and Dependabot's own (`dependencies`,
`github_actions`, `javascript`) which it applies automatically to its PRs —
don't hand-apply those.

## Creating a new issue

- One concern per issue — don't fold unrelated work in because it's
  convenient.
- Write acceptance criteria as outcomes a reviewer can check off, not a
  restatement of the plan.
- State dependencies explicitly ("Depends on #N") and respect build order —
  don't start an issue whose dependency isn't merged yet.
- Tag with the full label set above (scope + phase + milestone + type) so
  filtering/reporting stays useful as the issue count grows.

## Closing issues

Reference `Closes #N` (or `Fixes #N`) in the PR description — see
[`.github/pull_request_template.md`](../.github/pull_request_template.md).
GitHub auto-closes the issue when that PR is merged, which is also what
CodeRabbit uses to pull in issue context for review (`assess_linked_issues`
in `.coderabbit.yaml` — see [CODERABBIT.md](./CODERABBIT.md)).
