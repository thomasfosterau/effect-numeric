# effect-numeric

## 0.1.0

### Minor Changes

- [#1](https://github.com/thomasfosterau/effect-numeric/pull/1) [`3a320be`](https://github.com/thomasfosterau/effect-numeric/commit/3a320be0710a5b802b4df7b3e0b3bafc254359fb) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - Initial release: fixed-width integers (`I8`–`I128`, `U8`–`U128`, and custom widths via `FixedInt.make` / `FixedInt.makeBig`) with strict, checked, wrapping, saturating and overflowing arithmetic; `Wrapping`, `Saturating`, `Checked` and `Overflowing` instances; clamped range types; `Float` type class with `F64`, `F32`, total ordering, `NotNaN` and `Finite`; exact `Ratio` and `Complex` numbers; `num-traits` style type classes, `num-integer` algorithms and numeric ranges.

### Patch Changes

- [#8](https://github.com/thomasfosterau/effect-numeric/pull/8) [`bf6a637`](https://github.com/thomasfosterau/effect-numeric/commit/bf6a637d616ffe729e808ebc864ff6e02a5f7510) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - Document what `Range.linspace` yields (`@yields`) in its doc comment, which ships in the emitted `.d.ts`.

- [#2](https://github.com/thomasfosterau/effect-numeric/pull/2) [`b2eedec`](https://github.com/thomasfosterau/effect-numeric/commit/b2eedec66fe473ab45e0f81e2e7d4b3abd24c980) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - The arithmetic errors (`OverflowError`, `DivisionByZeroError`, `OutOfRangeError`, `DomainError`, `ParseError`) are now `Schema.TaggedError` classes instead of `Data.TaggedError`, so they can be encoded and decoded with `Schema`. Their `_tag`, fields, `message` text, `Effect` yieldability and structural equality are unchanged. `Ratio` and `Complex` also export type aliases for their schemas (`Ratio.schema`, `Ratio.schemaFromString`, `Complex.schema`, `Complex.schemaFromStruct`); no runtime behaviour changes.

- [#12](https://github.com/thomasfosterau/effect-numeric/pull/12) [`773a406`](https://github.com/thomasfosterau/effect-numeric/commit/773a40663314cc5548e5ee856c460bce8b14cc66) Thanks [@thomasfosterau](https://github.com/thomasfosterau)! - Declare `toString(): string` on the `Complex` and `Ratio` interfaces. Every value already had it at runtime (it is what `String(value)`, `Complex.toString` and `Ratio.toString` call); the declaration lets TypeScript see it, so stringifying a `Complex` or `Ratio` no longer reads as `[object Object]` to type-aware tooling.
