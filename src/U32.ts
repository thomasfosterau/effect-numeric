/**
 * Unsigned 32-bit integers in `[0, 2^32 - 1]`, equivalent to Rust's `u32`.
 *
 * Values are represented at runtime as a branded `number`.
 *
 * @example
 * ```ts
 * import { U32 } from "effect-numeric"
 *
 * const a = U32.make(200)
 * const b = U32.make(100)
 *
 * U32.checkedAdd(a, b)    // Option<U32>
 * U32.wrappingAdd(a, b)   // U32
 * U32.saturatingAdd(a, b) // U32
 * U32.add(a, b)           // Result<U32, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A unsigned 32-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type U32 = number & Brand.Brand<"U32">

/**
 * Operations on {@link U32} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const U32: FixedInt.FixedInt<U32, number> = /* @__PURE__ */ FixedInt.make<U32>({
  name: "U32",
  bits: 32,
  signed: false
})
