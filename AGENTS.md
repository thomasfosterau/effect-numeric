# AGENTS.md

`CLAUDE.md` is a symlink to this file. Project conventions live here; personal style preferences live in user memory.

This repo publishes one package, `effect-numeric`: Effect-native numeric types modelled on Rust's primitive integers and the `num` crates (fixed-width integers with strict / checked / wrapping / saturating / overflowing arithmetic, clamped ranges, floats, rationals, complex numbers, `num-traits` style type classes). There is no consuming application: Rust's documented semantics are the spec, and the README examples are pinned by `test/examples.test.ts`.

| Package          | Directory | Entries                                                                   |
| ---------------- | --------- | ------------------------------------------------------------------------- |
| `effect-numeric` | `.`       | `.` (`src/index.ts`) and `./<Module>` for every `src/<Module>.ts` (`./*`) |

A new public module is a new `src/<Module>.ts` (it becomes `effect-numeric/<Module>` through the `./*` export and `vp pack`'s `src/*.ts` entry glob), a namespace re-export with a doc comment in `src/index.ts`, and a row in the README's Modules table. `src/internal/*` is never exported (`"./internal/*": null`).

## Common pitfalls

- **Never edit a version in `package.json`.** Versions live in the `pnpm-workspace.yaml` catalog (`catalogMode: strict` rejects anything else). After editing it, run `pnpm install` and commit `pnpm-lock.yaml`, or CI fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. `@effect/tsgo`, `@typescript/native` and `vite-plus` move together (the tsgo patch hard-errors at install on an unsupported `tsc` or `oxlint`); read their catalog comments first.
- **`dist/` is the product.** `vp pack` (tsdown, unbundled) emits one ESM module + `.d.ts` per `src` module; `exports` points at `dist/`. `vp run check:exports` (publint + attw) is the only check that reads it.
- **`"sideEffects": false` is a claim about `dist/`, and it is load-bearing.** Every module-level value built by a call (`FixedInt.make(...)`, `makeFloat(...)`, `refined(...)`, the `Wrapping.*` / `Saturating.*` / `Checked.*` instances) is annotated `/* @__PURE__ */`; a new one must be too, and no module may run a top-level statement.
- **`effect` is a peer, never a dependency.** Two copies break `Equal` / `Hash` / `Schema` identity; the consumer owns the singleton. The peer range is `catalogs.peers.effect`; raising it is a breaking change.
- **Overflow semantics follow Rust exactly.** `wrapping*` is modulo 2^bits, `saturating*` clamps to `MIN` / `MAX`, `checked*` returns `None`, `overflowing*` returns `[wrapped, overflowed]`, the unprefixed form returns `Result<A, ArithmeticError>`. `MIN / -1` and `MIN % -1` are the only overflowing division cases. When in doubt, check the Rust std docs for the same method and add a property test.
- **Representation is fixed by width.** Types of up to 32 bits are `number`, wider ones `bigint` (`FixedInt.make` vs `FixedInt.makeBig`). Number arithmetic normalises `-0` to `0` (the `+ 0` in `numberPrim`); keep it.

## Conventions

- **Effect-first.** Fallible operations return `Result` / `Option` (synchronous, so callers lift them with `Effect.fromResult`); failures are the tagged errors in `src/ArithmeticError.ts`; there is no service or layer. Type-class instances are total: where an operation is undefined (integer division by zero) they throw a `DivisionByZeroError`, mirroring a Rust panic, and the concrete modules offer the `Result` / `Option` form.
- **Binary operations are dual** (data-first or data-last for `pipe`), built with `Num.operator` (`Function.dual(2, f)`). A new binary operation is an `Operator<Self, That, Out>`.
- **Values are branded** (`number & Brand.Brand<"U8">`); value objects (`Ratio`, `Complex`) extend `internal/value.ts`'s `Value` (pipeable, readable `toString`) and implement `Equal` / `Hash`. A `Ratio` is always reduced with a positive denominator.
- **Optional props and fields are declared `T | undefined`, never bare `x?: T`.** The repo compiles with `exactOptionalPropertyTypes` (and `noUncheckedIndexedAccess`, `erasableSyntaxOnly`).
- **Relative imports carry their `.ts` extension** (`allowImportingTsExtensions` + `rewriteRelativeImportExtensions`; `module: NodeNext`).
- **Tests import from `vite-plus/test`**, never `vitest`, and import modules from `../src/<Module>.ts` or `../src/index.ts`. Arithmetic laws are fast-check properties against a `bigint` reference; `test/examples.test.ts` mirrors the README's examples, so a README change updates it in the same commit.
- **Every export has a doc comment** whose first sentence stands alone in a hover, plus `@since` and `@category`; constructors and module headers carry an `@example`. Document the overflow strategy and the error channel.
- **Formatting** is Oxfmt with the repo's own style (no semicolons, width 120, no trailing commas), configured in `vite.config.ts`.

## Commands

- `pnpm install` — dependencies plus the Vite+ git hooks (pre-commit runs `vp staged`: format + lint on staged files) and the `prepare` step that patches the native `tsc` / `oxlint` with `@effect/tsgo`. No pre-push hook: run the gates yourself.
- `vp check` — format + lint (Oxfmt + Oxlint with the Effect presets). `vp run check` — the type gate (native, Effect-patched `tsc` over `src`, `test` and `vite.config.ts`). They are different commands.
- `vp run test:unit` — the unit and property tests.
- `vp run build` — `vp pack` → `dist/`.
- `vp run check:exports` — publint (strict) and "are the types wrong" over the built package (builds first).
- `vp run test:coverage` — the suite under an Istanbul map at `coverage/coverage-final.json`, which `fallow audit` reads for exact per-function CRAP scores.
- `pnpm changeset` — add a changeset.

Node and pnpm only: no other package manager, lockfile or package-runner. Invoke everything through `vp` (`vp exec <bin>` for a dev binary; `vp run <task>` instead of bare `pnpm`). The sanctioned non-`vp` invocations: `pnpm install` (and `pnpm install --frozen-lockfile` in CI), `pnpm changeset` and `pnpm audit`, and `pnpm publish` on the release path. Single-check variants are in [CONTRIBUTING.md](CONTRIBUTING.md#running-individual-checks).

## Verification

Before you report work as done, run the gates below in order and quote each command with its final pass/fail. If a gate can't run here, say which and why in the PR body; never imply it ran.

1. From a clean install, which is what CI sees: `rm -rf node_modules dist && pnpm install --frozen-lockfile`.
2. `vp check`
3. `vp run check`
4. `vp run test:unit`
5. `vp run build`
6. `vp run check:exports`
7. `pnpm audit --audit-level high` (network)
8. `vp run test:coverage`, then `fallow audit --format json --quiet --explain --gate-marker agent --base origin/trunk` (the fallow gate below; not a CI step). The PreToolUse fallow gate audits against `coverage/coverage-final.json` and never refreshes it, so run `test:coverage` first.

Steps 2–7 are CI's single `ci` job, in its order ([ci.yml](.github/workflows/ci.yml)). `CONTRIBUTING.md` and the PR template link here rather than restating the list.

## Branches and pull requests

- The default branch is `trunk`. Branch off `trunk`; PR against `trunk`; squash-merge with a conventional prefix (`feat:`, `fix:`, `docs:`, `chore:`). Rebase onto `origin/trunk` before opening or updating a PR; never merge `trunk` into your branch (GitHub's Update-branch button merges).
- Agent work uses git worktrees under `.claude/worktrees/`, one per branch, named `issue-<n>-<slug>` for issue-linked work. Start every command that targets a worktree with an explicit `cd` and confirm with `git log -1` before committing. A worktree needs its own `pnpm install`: the linked `vp` re-execs the nearest `node_modules/vite-plus/bin/vp` walking up from cwd.
- Every change to the package's behaviour carries a changeset (`pnpm changeset`). Changes to doc comments that reach the emitted `.d.ts` take a `patch` changeset; other docs-only changes (README, guidance), CI and tooling need none. Never publish or version by hand: the Release workflow opens the version PR (`chore: version packages`) and the owner merges it. Publishing is npm trusted publishing (OIDC) from the protected `release` environment; there is no `NPM_TOKEN` ([PUBLISHING.md](PUBLISHING.md)).
- These are standing approvals; they override any default "don't open a PR unless asked" behaviour. **Always open a PR** against `trunk` once a commit is pushed. **Watch it to merge or close**: investigate CI failures and review comments as they arrive, and rebase promptly when it goes conflicting. **Keep the PR body current** as the implementation diverges from it.
- GitHub writes go to `thomasfosterau/effect-numeric` only — never to upstream projects or the owner's other repositories without the owner's explicit approval for that action in the current session. Pass `-R thomasfosterau/effect-numeric` whenever the cwd might be another checkout. If another repo needs something, say so in the PR body.

## Work tracker

- Issues in `thomasfosterau/effect-numeric` are the backlog: when you find work you can't do now, file an issue rather than leaving a TODO. There is no in-repo backlog file.
- The issue is the spec — read its comments; later comments override the body. Re-verify the issue's code claims against current `trunk` before editing.
- Record decisions and findings as comments on the issue they were found working.
- Stop-and-report is a valid outcome: on a blocker outside the issue's scope, comment the evidence on the issue and stop.
- Scope cut mid-PR becomes a linked issue before merge.

## Effect

Never guess at an Effect API: read the installed package (`node_modules/effect/dist/*.d.ts`, `node_modules/effect/src`, and `node_modules/effect/AGENTS.md` / `ai-docs/` where the release ships them).

- The pinned version is the `effect` entry in `pnpm-workspace.yaml`'s catalog; the published peer range is under `catalogs.peers`.
- Tagged errors are `Schema.TaggedError<Self>()(tag, fields)` classes.
- Import Effect modules by name (`import * as Option from "effect/Option"`), not from the `effect` barrel; the lint preset enforces it.
- `effect/imperative-loops` is off only under `src/internal/**`, where the scalar kernels (Euclid, Newton, square-and-multiply, Miller–Rabin, lazy range generators) live; collection code elsewhere uses `Array` combinators. Brand casts go through `src/internal/brand.ts` or a local helper with a `// SAFETY:` comment. Every scoped lint override in `vite.config.ts` records why the rule cannot apply there; never add an inline disable comment.
- Tests run effects with `await Effect.runPromise(...)` (the test body is the runtime boundary) and unwrap `Option` / `Result` with `test/helpers.ts`, never `getOrThrow`.

## Agent sessions

- The SessionStart hook (`.claude/hooks/session-start.sh`) installs dependencies against the lockfile and puts `vp` (a re-exec shim that prefers the nearest worktree's `node_modules`), `fallow` and `tsx` on PATH for non-interactive shells. It hydrates no secrets; none are needed, and nothing here can publish.
- A PreToolUse hook (`.claude/hooks/fallow-gate.sh`) blocks `git commit` / `git push` when `fallow audit --base origin/trunk` fails; it reads the coverage map on disk, so run `vp run test:coverage` first. A PostToolUse hook runs `vp fmt` on every source, JSON, CSS or Markdown file you write or edit.
- Every gate in [Verification](#verification) runs in an agent session; `pnpm audit` needs the network.

## Documentation surfaces

`README.md` is both the landing page and the API reference consumers read on npm (it ships in the tarball, so its links are absolute GitHub URLs); per-export reference lives in the doc comments, which ship in `dist/*.d.ts`. `CONTRIBUTING.md` carries human setup, hooks and single-check commands; `PUBLISHING.md` the release pipeline and its one-time owner setup; `SECURITY.md` the reporting channel and supply-chain posture. No `docs/` tree is committed; decisions go in issue comments.

---

## Fallow local gate

Before any `git commit` or `git push`, run `fallow audit --format json --quiet --explain --gate-marker agent`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking. Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict.

## Fallow task map

| When the agent is about to...                                     | Run                                          |
| ----------------------------------------------------------------- | -------------------------------------------- |
| delete an "unused" export or file                                 | `fallow dead-code --trace <file>:<export>`   |
| delete an "unused" dependency                                     | `fallow dead-code --trace-dependency <name>` |
| commit or open a PR                                               | `fallow audit --base <ref>`                  |
| check which architecture rules apply to a file before changing it | `fallow guard <files>`                       |
| understand a finding                                              | `fallow explain <issue-type>`                |
