/**
 * Signed 128-bit integers in `[-2^127, 2^127 - 1]`, equivalent to Rust's `i128`.
 *
 * Values are represented at runtime as a branded `bigint`.
 *
 * @example
 * ```ts
 * import { I128 } from "effect-numeric"
 *
 * const a = I128.make(100n)
 * const b = I128.make(50n)
 *
 * I128.checkedAdd(a, b)    // Option<I128>
 * I128.wrappingAdd(a, b)   // I128
 * I128.saturatingAdd(a, b) // I128
 * I128.add(a, b)           // Result<I128, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A signed 128-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type I128 = bigint & Brand.Brand<"I128">

/**
 * Operations on {@link I128} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const I128: FixedInt.FixedInt<I128, bigint> = /* @__PURE__ */ FixedInt.makeBig<I128>({
  name: "I128",
  bits: 128,
  signed: true
})
