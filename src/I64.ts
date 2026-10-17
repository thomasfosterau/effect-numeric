/**
 * Signed 64-bit integers in `[-2^63, 2^63 - 1]`, equivalent to Rust's `i64`.
 *
 * Values are represented at runtime as a branded `bigint`.
 *
 * @example
 * ```ts
 * import { I64 } from "effect-numeric"
 *
 * const a = I64.make(100n)
 * const b = I64.make(50n)
 *
 * I64.checkedAdd(a, b)    // Option<I64>
 * I64.wrappingAdd(a, b)   // I64
 * I64.saturatingAdd(a, b) // I64
 * I64.add(a, b)           // Result<I64, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A signed 64-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type I64 = bigint & Brand.Brand<"I64">

/**
 * Operations on {@link I64} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const I64: FixedInt.FixedInt<I64, bigint> = /* @__PURE__ */ FixedInt.makeBig<I64>({
  name: "I64",
  bits: 64,
  signed: true
})
