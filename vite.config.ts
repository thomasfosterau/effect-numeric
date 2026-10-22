/**
 * The one Vite+ configuration for this single-package repo: the repo-wide
 * format / lint / staged passes (read statically by `vp fmt` / `vp lint` /
 * `vp staged`), the task graph (`check`, `build`, `check:exports`,
 * `test:unit`, `test:coverage`), the `vp pack` (tsdown) settings and the
 * vitest / coverage settings.
 *
 * Shaped after the effect-web library family's root `vite.config.ts` and
 * `vite.package.ts`, folded into one file because there is one package.
 *
 * @copyright Thomas Foster
 */

import { defineConfig } from "vite-plus"
import { recommended } from "@effect/tsgo/oxlint-presets"
import effect from "@mpsuesser/oxlint-plugin-effect"

/**
 * Input fingerprint for the cached tasks: auto tracking minus node_modules
 * bookkeeping churn (pnpm rewrites `.modules.yaml` on every install), with the
 * lockfile back explicitly so a dependency upgrade still invalidates a
 * type-check or a test run.
 */
const cacheInputs = [{ auto: true }, "!node_modules/**", "pnpm-lock.yaml"]

/** Environment the test tasks read (and fingerprint): CI's worker ceiling. */
const testEnv = ["VITEST_MAX_WORKERS", "NODE_OPTIONS"]

const maxWorkers = process.env.VITEST_MAX_WORKERS

export default defineConfig({
  // Staged-file checks run by `vp staged` (pre-commit).
  staged: {
    "*.{js,ts,json,md}": "vp check --fix"
  },
  fmt: {
    // The style this repo carried under Biome, kept so the migration does not
    // reformat every source line.
    semi: false,
    printWidth: 120,
    trailingComma: "none",
    arrowParens: "always",
    ignorePatterns: ["**/dist/**", "**/coverage/**", "CHANGELOG.md"],
    overrides: [
      {
        files: ["**/*.md"],
        options: {
          proseWrap: "never"
        }
      }
    ]
  },
  lint: {
    ignorePatterns: ["**/dist/**", "**/coverage/**", "**/node_modules/**"],
    extends: [recommended, effect.configs.recommended],
    categories: {
      correctness: "error"
    },
    rules: {
      "eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "eslint/prefer-const": "warn",
      // `casting-awareness` is an awareness prompt, not a defect rule — it
      // fires on every `as`, including the brand casts every fixed-width
      // constructor is built on (a `number` becomes an `I8` only by `as`
      // after its range check). Stays visible as a warning.
      "effect/casting-awareness": "warn",
      // Hard-codes abbreviations (`Arr`, `P`, `R`, …) with no options, so it is
      // unsatisfiable under the full-name convention (`import * as Option from
      // "effect/Option"`) this family shares with its consumers.
      "effect/prefer-namespace-imports": "off",
      "typescript/no-explicit-any": "off",
      "typescript/no-empty-object-type": "off",
      "typescript/ban-ts-comment": "off",
      "unicorn/no-empty-file": "off",
      "vite-plus/prefer-vite-plus-imports": "error"
    },
    overrides: [
      // The build/test config is evaluated by Vite and Vitest in bare Node,
      // before any Effect runtime exists — there is no `Config` provider to
      // read from, so `process.env` is the only thing that works there.
      {
        files: ["vite.config.ts"],
        rules: {
          "effect/avoid-process-env": "off",
          "effect/no-conditional-empty-object-spread": "off"
        }
      }
    ],
    // Type-aware linting is intentionally disabled: type checking stays the
    // `check` task's job (native tsc, Effect-patched).
    options: {
      typeAware: false,
      typeCheck: false
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin"
      }
    ]
  },
  run: {
    tasks: {
      // The type gate: `src`, the tests and this config under the native,
      // Effect-patched `tsc`.
      check: {
        command: "tsc -p tsconfig.json",
        cache: { input: cacheInputs, output: [] }
      },
      // The published artifact: one ESM module + declaration file per source
      // module (`vp pack` → tsdown, unbundled, `platform: neutral`), so every
      // `effect-numeric/<Module>` subpath in `exports` has a file behind it.
      // `sideEffects: false` is a claim about this output: no top-level
      // statements beyond `/* @__PURE__ */` constructions.
      build: {
        command: "vp pack",
        cache: { input: cacheInputs, output: ["dist/**"] }
      },
      // The dist check: publint (strict) over the manifest and `dist/`, then
      // "are the types wrong" over the packed tarball as an ESM-only package.
      "check:exports": {
        command: "publint --strict && attw --pack . --profile esm-only",
        dependsOn: ["build"],
        cache: false
      },
      "test:unit": {
        command: "vp test run",
        cache: { env: testEnv, input: cacheInputs, output: [] }
      },
      // The unit suite under one Istanbul map (`coverage/coverage-final.json`),
      // which `fallow audit` reads for exact per-function CRAP scores
      // (`health.coverage` in .fallowrc.json). Without it fallow estimates
      // every function as uncovered, and any function with cyclomatic
      // complexity ≥ 5 fails the gate on its own. Run this before
      // `fallow audit` (the Claude Code PreToolUse fallow gate runs the audit
      // on `git commit` / `git push` but never refreshes this map).
      "test:coverage": {
        command: "vp test run --coverage",
        cache: { env: testEnv, input: cacheInputs, output: ["coverage/**"] }
      }
    }
  },
  pack: {
    entry: ["src/*.ts"],
    unbundle: true,
    format: "esm",
    platform: "neutral",
    dts: { tsconfig: "tsconfig.build.json" },
    outDir: "dist",
    clean: true
  },
  test: {
    include: ["test/**/*.test.ts"],
    ...(maxWorkers === undefined ? {} : { maxWorkers: Number(maxWorkers) }),
    coverage: {
      provider: "istanbul",
      // `json` writes coverage-final.json, the Istanbul map `fallow audit`
      // reads for exact per-function CRAP scores.
      reporter: ["text-summary", "json-summary", "json"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["**/*.d.ts"]
    }
  }
})
