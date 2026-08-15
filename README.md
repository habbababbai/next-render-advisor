# next-render-strategy

Helps Next.js **App Router** developers decide whether a component should be a
**Server Component** or a **Client Component**, and whether a route should be
**static**, **ISR**, or **dynamic** — before you write it, or by auditing code you
already have.

## Why

Two moments where this decision gets made badly:

1. **Writing a new component.** No existing tool helps here — you either default
   to `'use client'` out of habit, or guess.
2. **Auditing existing code.** Tools exist, but shallower than they look — see
   [PLAN.md](./PLAN.md#research-notes-checked-before-committing-to-build-our-own-rules)
   for what was actually found inspecting their source.

Both moments should be answered by the same rule logic, so the tool never
contradicts itself between "here's what I'd build" and "here's what's wrong with
what you built."

## Status

Early and in active development. What's real today vs. planned:

| Piece | Status |
|---|---|
| Classification core (`classifyComponent`, `classifyRoute`) | ✅ Implemented, 100% branch coverage — [`src/rules.ts`](./src/rules.ts) |
| Interactive wizard (Normal / Dummy mode) | 🚧 Designed, not yet implemented — [QUESTIONS.md](./QUESTIONS.md) |
| CLI (`nra` / `next-render-strategy`) | 🚧 Not yet implemented |
| Repo scanner | 📋 Planned, deferred to Phase 2 — [PLAN.md](./PLAN.md#phase-2--repo-scanner-deferred) |
| Published to npm | Not yet — local development only |

## The idea, briefly

One deterministic core (`classify*(signals) → verdict`), fed by two different
signal producers — a plain-language wizard for components that don't exist yet, an
AST scanner for ones that do. Two rules keep the advice trustworthy rather than
guessed:

- **Component-level and route-level are never merged.** Client-vs-server is a
  per-component question; static-vs-dynamic is a per-route question. A page can be
  fully static and still contain a legitimately interactive Client Component.
- **Uncertainty defaults are asymmetric, on purpose.** An unresolved signal on the
  component axis defaults to "client" (cheap to be wrong about — Next.js's own
  compiler backstops the opposite mistake). An unresolved signal on the route axis
  defaults to "dynamic" (guessing static wrong risks serving stale or leaked
  per-user content).

Full rationale, including what was learned inspecting existing tools' actual
source, lives in [PLAN.md](./PLAN.md).

## Development

Requires Node ≥ 18.

```bash
git clone <repo-url>
cd next-render-strategy
npm install
npm test
```

`npm test` is expected to run `vitest run`; `npm run test:coverage` should run
`vitest run --coverage`. `src/rules.ts` is held to 100% branch coverage — see
[CONTRIBUTING.md](./CONTRIBUTING.md) before touching it.

## Project structure

```
src/rules.ts         pure classification core (done)
test/rules.test.ts   table-driven tests (done)
PLAN.md               full design rationale
CHECKLIST.md          build order / what's done vs pending
QUESTIONS.md          wizard question bank (Normal vs Dummy mode)
```

Not yet built: `src/wizard.ts`, `src/format.ts`, `src/cli.ts`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [LICENSE](./LICENSE).
