/**
 * Unsigned 128-bit integers in `[0, 2^128 - 1]`, equivalent to Rust's `u128`.
 *
 * Values are represented at runtime as a branded `bigint`.
 *
 * @example
 * ```ts
 * import { U128 } from "effect-numeric"
 *
 * const a = U128.make(200n)
 * const b = U128.make(100n)
 *
 * U128.checkedAdd(a, b)    // Option<U128>
 * U128.wrappingAdd(a, b)   // U128
 * U128.saturatingAdd(a, b) // U128
 * U128.add(a, b)           // Result<U128, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A unsigned 128-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type U128 = bigint & Brand.Brand<"U128">

/**
 * Operations on {@link U128} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const U128: FixedInt.FixedInt<U128, bigint> = /* @__PURE__ */ FixedInt.makeBig<U128>({
  name: "U128",
  bits: 128,
  signed: false
})
