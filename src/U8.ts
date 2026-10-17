/**
 * Unsigned 8-bit integers in `[0, 2^8 - 1]`, equivalent to Rust's `u8`.
 *
 * Values are represented at runtime as a branded `number`.
 *
 * @example
 * ```ts
 * import { U8 } from "effect-numeric"
 *
 * const a = U8.make(200)
 * const b = U8.make(100)
 *
 * U8.checkedAdd(a, b)    // Option<U8>
 * U8.wrappingAdd(a, b)   // U8
 * U8.saturatingAdd(a, b) // U8
 * U8.add(a, b)           // Result<U8, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A unsigned 8-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type U8 = number & Brand.Brand<"U8">

/**
 * Operations on {@link U8} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const U8: FixedInt.FixedInt<U8, number> = /* @__PURE__ */ FixedInt.make<U8>({
  name: "U8",
  bits: 8,
  signed: false
})
