# CodeRabbit on this repo

How CodeRabbit is configured to behave here (`.coderabbit.yaml`), and the
manual steps that make the intended flow actually work in practice.

## Intended flow

1. You open a PR.
2. CodeRabbit reviews it once, automatically — either clean, or with inline
   comments.
3. You address comments one at a time: push a fix commit, or reply/discuss
   if no code change is needed. You do **not** need to do anything else per
   comment — CodeRabbit detects the fix in a later commit and marks its own
   thread "Resolved" on its own.
4. Pushes do **not** trigger a re-review by themselves
   (`auto_incremental_review: false`) — no repeated full scans burning
   review budget while you're mid-fix.
5. Once everything's addressed, comment `@coderabbitai review` **once**.
   It checks all previously-raised comments against the current state.
6. If nothing's outstanding and CI is green, `request_changes_workflow`
   makes CodeRabbit auto-approve. No manual `@coderabbitai approve` exists
   or is needed.

**Only you trigger CodeRabbit commands on PRs** (`@coderabbitai review`,
`full review`, `pause`, etc.) — not Claude, not any other automation.

## Commands you'll actually use

| Command | When to use it |
|---|---|
| `@coderabbitai review` | Default choice once you're done addressing comments. Incremental — only re-checks what changed + prior comments. Cheap. |
| `@coderabbitai full review` | Fallback if `review` is rate-limited (see below), or if you want a from-scratch pass ignoring prior comments. More expensive. |
| `@coderabbitai pause` / `resume` | Halts/restores CodeRabbit's own automatic behavior. Doesn't affect the `review`/`full review` rate limit — see below. |

There is no `@coderabbitai approve` command. Approval only happens as a side
effect of a review run finding nothing outstanding, via
`request_changes_workflow: true`.

## Known quirks (not config-fixable, just know about them)

- **First review on a low-star repo needs a manual nudge.** CodeRabbit's own
  bot comment said "Reviews should be triggered manually for repositories
  with fewer than 10 stars" — undocumented publicly, but confirmed directly
  on this repo. Until that changes, expect to comment `@coderabbitai review`
  (or `full review`) yourself right after opening a PR instead of it firing
  automatically. Re-check this once the repo has more stars.
- **`@coderabbitai review` has an undocumented rate limit.** Triggering it
  twice a few minutes apart got "Review rate limited" both times. The
  explanatory text attached to that error ("applicable only when automatic
  reviews are paused") is misleading boilerplate — running `@coderabbitai
  pause` first and retrying did **not** help. If you hit this, either wait
  longer or use `@coderabbitai full review` instead (didn't hit the same
  limit in testing).
- **A resolved thread doesn't clear a stale "Changes requested" verdict.**
  CodeRabbit auto-resolving its own comment thread (step 3 above) is
  separate from the PR's formal review decision. If you're blocked from
  merging with everything fixed/resolved but CodeRabbit hasn't re-reviewed
  yet (e.g. you're rate-limited), the reliable unblock that doesn't depend
  on CodeRabbit at all is to **dismiss the stale review** yourself: PR →
  reviewers panel → "..." on CodeRabbit's review → Dismiss review. This
  repo's merge rules (`gh api repos/OWNER/REPO/rulesets`) don't actually
  require an approval count (`required_approving_review_count: 0`) — the
  block is purely GitHub's default behavior of disabling merge while any
  review says "changes requested," regardless of rule config.

## Config keys in play (`.coderabbit.yaml`)

- `reviews.request_changes_workflow: true` — the only key driving
  auto-approval. There is no `auto_approve` key in CodeRabbit's schema
  (verified against the published schema directly) — don't re-add one.
- `reviews.auto_review.enabled: true` — review PRs automatically (subject
  to the low-star caveat above).
- `reviews.auto_review.auto_incremental_review: false` — don't re-review on
  every push; wait for a manual `@coderabbitai review`.
