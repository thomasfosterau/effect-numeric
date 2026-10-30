# Contributing

Maintained by Thomas Foster, with a workflow meant to be approachable for both humans and coding agents. Conventions are in [AGENTS.md](AGENTS.md).

## Setup

You need Node.js 22 or later (CI runs the latest release) and pnpm 11 (`corepack enable` picks up the version pinned by `packageManager`). Use pnpm only: no other package manager or lockfile. Then:

```sh
pnpm install
```

That installs the dependencies, the Vite+ git hooks and the `@effect/tsgo` patch of the native `tsc` / `oxlint` (the `prepare` script). Every later command runs through `vp`, the Vite+ CLI in `node_modules/.bin` (or a global `vp`, which defers to the project-local one).

## Branches

Branch off `trunk`, rebase rather than merge, squash-merge with a conventional prefix: see [AGENTS.md](AGENTS.md#branches-and-pull-requests).

## Git hooks

Hooks are managed by Vite+; the editable [.vite-hooks/pre-commit](.vite-hooks/pre-commit) is committed. **pre-commit** runs `vp staged` (format + lint on staged files). There is no pre-push hook.

## CI expectations

[ci.yml](.github/workflows/ci.yml) runs one required job, `ci`, whose steps are the gate list in [AGENTS.md](AGENTS.md#verification). [release.yml](.github/workflows/release.yml) runs changesets/action on `trunk`: it opens the version PR while unreleased changesets exist and publishes once it merges, via npm OIDC trusted publishing (see [PUBLISHING.md](PUBLISHING.md)). Both workflows default to `permissions: {}` and grant per job only what it needs; every action is pinned to a commit SHA; `ci` needs no secrets or OIDC (so a Dependabot PR runs the full gate with nothing to steal) and keeps no checkout credentials; `release` never runs for a Dependabot push. `uvx zizmor .github` audits them (exceptions in [.github/zizmor.yml](.github/zizmor.yml)).

## Pre-PR checklist

1. The gates in [AGENTS.md](AGENTS.md#verification), each with its final pass/fail.
2. A changeset (`pnpm changeset`) where [AGENTS.md](AGENTS.md#branches-and-pull-requests) requires one.
3. `git fetch origin trunk && git rebase origin/trunk`
4. Docs: the README for any exported change (and `test/examples.test.ts`, which pins the README's examples); `AGENTS.md` for a new convention or invariant.

## Running individual checks

```sh
vp lint                                  # oxlint (with the Effect presets)
vp fmt                                   # oxfmt
vp run check                             # the type gate
vp run test:unit                         # unit and property tests
vp test run test/Ratio.test.ts           # a single file
vp run build                             # emit dist/
vp run check:exports                     # publint + are-the-types-wrong over dist/
vp run test:coverage                     # the Istanbul map fallow reads
vp run fallow:audit                      # change-set review (not a CI gate)
```
