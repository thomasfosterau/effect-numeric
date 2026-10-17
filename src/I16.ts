/**
 * Signed 16-bit integers in `[-2^15, 2^15 - 1]`, equivalent to Rust's `i16`.
 *
 * Values are represented at runtime as a branded `number`.
 *
 * @example
 * ```ts
 * import { I16 } from "effect-numeric"
 *
 * const a = I16.make(100)
 * const b = I16.make(50)
 *
 * I16.checkedAdd(a, b)    // Option<I16>
 * I16.wrappingAdd(a, b)   // I16
 * I16.saturatingAdd(a, b) // I16
 * I16.add(a, b)           // Result<I16, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A signed 16-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type I16 = number & Brand.Brand<"I16">

/**
 * Operations on {@link I16} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const I16: FixedInt.FixedInt<I16, number> = /* @__PURE__ */ FixedInt.make<I16>({
  name: "I16",
  bits: 16,
  signed: true
})
