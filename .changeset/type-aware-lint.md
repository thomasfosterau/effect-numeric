---
"effect-numeric": patch
---

Declare `toString(): string` on the `Complex` and `Ratio` interfaces. Every value already had it at runtime (it is what `String(value)`, `Complex.toString` and `Ratio.toString` call); the declaration lets TypeScript see it, so stringifying a `Complex` or `Ratio` no longer reads as `[object Object]` to type-aware tooling.
