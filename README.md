# next-render-advisor

Helps Next.js **App Router** developers decide whether a component should be a
**Server Component** or a **Client Component**, and whether a route should be
**static**, **ISR**, or **dynamic** — before you write it, or by auditing code you
already have.

## Why

Two moments where this decision gets made badly:

1. **Writing a new component.** No existing tool helps here — you either default
   to `'use client'` out of habit, or guess.
2. **Auditing existing code.** Tools exist, but shallower than they look — existing
   solutions don't catch all the cases or surface contradictions.

Both moments should be answered by the same rule logic, so the tool never
contradicts itself between "here's what I'd build" and "here's what's wrong with
what you built."

## Status

Early and in active development. What's real today vs. planned:

| Piece | Status |
|---|---|
| Classification core (`classifyComponent`, `classifyRoute`) | ✅ Implemented, 100% branch coverage — [`src/rules.ts`](./src/rules.ts) |
| Interactive wizard (Normal / Dummy mode) | 🚧 Not yet implemented |
| CLI (`nra` / `next-render-advisor`) | 🚧 Not yet implemented |
| Repo scanner | 📋 Planned, Phase 2 |
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

## Development

Requires Node ≥ 18 and pnpm.

```bash
git clone <repo-url>
cd next-render-advisor
pnpm install
pnpm test
```

`pnpm test` runs `vitest run`; `pnpm test:coverage` runs `vitest run --coverage`. 
`src/rules.ts` is held to 100% branch coverage.

**Before contributing:** Read [CLAUDE.md](./CLAUDE.md) for project invariants,
testing requirements, and working style.

### Claude Code Setup (Optional)

If you use Claude Code, this project is pre-configured with MCP servers in
`.claude/settings.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "/opt/homebrew/bin/mcp-server-github",
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

The GitHub MCP server reads its token from the `GITHUB_PERSONAL_ACCESS_TOKEN`
environment variable — it does **not** reuse `gh`'s stored credentials, so it
needs its own token even if you're already logged in with `gh auth login`.

**One-time setup:**

1. Create a token at
   [github.com/settings/tokens](https://github.com/settings/tokens) (a
   fine-grained token scoped to this repo with **Pull requests** and
   **Issues: Read** is enough; classic tokens need the `repo` scope for
   private repos).
2. Add it to your zsh config so it's available in every shell:

   ```bash
   echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"' >> ~/.zshrc
   source ~/.zshrc
   ```

3. Restart Claude Code (or open a new terminal) so it picks up the env var.
   Claude Code will prompt to approve MCP servers on first use:
   - GitHub MCP (search repos, manage issues/PRs)
   - npm MCP (search packages, manage dependencies)

No additional setup needed beyond that.

## Project structure

```
src/rules.ts         pure classification core — decision logic (done)
test/rules.test.ts   100% branch coverage tests (done)
src/wizard.ts        interactive Q&A wizard (planned)
src/cli.ts           command-line interface (planned)
src/scanner.ts       AST-based code audit (planned, Phase 2)
```

See [CLAUDE.md](./CLAUDE.md) for architecture details and invariants.

## License

MIT — see [LICENSE](./LICENSE).
