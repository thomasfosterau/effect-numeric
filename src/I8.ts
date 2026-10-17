/**
 * Signed 8-bit integers in `[-2^7, 2^7 - 1]`, equivalent to Rust's `i8`.
 *
 * Values are represented at runtime as a branded `number`.
 *
 * @example
 * ```ts
 * import { I8 } from "effect-numeric"
 *
 * const a = I8.make(100)
 * const b = I8.make(50)
 *
 * I8.checkedAdd(a, b)    // Option<I8>
 * I8.wrappingAdd(a, b)   // I8
 * I8.saturatingAdd(a, b) // I8
 * I8.add(a, b)           // Result<I8, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A signed 8-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type I8 = number & Brand.Brand<"I8">

/**
 * Operations on {@link I8} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const I8: FixedInt.FixedInt<I8, number> = /* @__PURE__ */ FixedInt.make<I8>({
  name: "I8",
  bits: 8,
  signed: true
})
