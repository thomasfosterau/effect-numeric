/**
 * Unsigned 64-bit integers in `[0, 2^64 - 1]`, equivalent to Rust's `u64`.
 *
 * Values are represented at runtime as a branded `bigint`.
 *
 * @example
 * ```ts
 * import { U64 } from "effect-numeric"
 *
 * const a = U64.make(200n)
 * const b = U64.make(100n)
 *
 * U64.checkedAdd(a, b)    // Option<U64>
 * U64.wrappingAdd(a, b)   // U64
 * U64.saturatingAdd(a, b) // U64
 * U64.add(a, b)           // Result<U64, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A unsigned 64-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type U64 = bigint & Brand.Brand<"U64">

/**
 * Operations on {@link U64} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const U64: FixedInt.FixedInt<U64, bigint> = /* @__PURE__ */ FixedInt.makeBig<U64>({
  name: "U64",
  bits: 64,
  signed: false
})
