/**
 * Unsigned 16-bit integers in `[0, 2^16 - 1]`, equivalent to Rust's `u16`.
 *
 * Values are represented at runtime as a branded `number`.
 *
 * @example
 * ```ts
 * import { U16 } from "effect-numeric"
 *
 * const a = U16.make(200)
 * const b = U16.make(100)
 *
 * U16.checkedAdd(a, b)    // Option<U16>
 * U16.wrappingAdd(a, b)   // U16
 * U16.saturatingAdd(a, b) // U16
 * U16.add(a, b)           // Result<U16, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A unsigned 16-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type U16 = number & Brand.Brand<"U16">

/**
 * Operations on {@link U16} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const U16: FixedInt.FixedInt<U16, number> = /* @__PURE__ */ FixedInt.make<U16>({
  name: "U16",
  bits: 16,
  signed: false
})
