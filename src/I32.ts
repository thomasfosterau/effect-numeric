/**
 * Signed 32-bit integers in `[-2^31, 2^31 - 1]`, equivalent to Rust's `i32`.
 *
 * Values are represented at runtime as a branded `number`.
 *
 * @example
 * ```ts
 * import { I32 } from "effect-numeric"
 *
 * const a = I32.make(100)
 * const b = I32.make(50)
 *
 * I32.checkedAdd(a, b)    // Option<I32>
 * I32.wrappingAdd(a, b)   // I32
 * I32.saturatingAdd(a, b) // I32
 * I32.add(a, b)           // Result<I32, OverflowError>
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as FixedInt from "./FixedInt.ts"

/**
 * A signed 32-bit integer.
 *
 * @category models
 * @since 0.1.0
 */
export type I32 = number & Brand.Brand<"I32">

/**
 * Operations on {@link I32} values.
 *
 * @category modules
 * @since 0.1.0
 */
export const I32: FixedInt.FixedInt<I32, number> = /* @__PURE__ */ FixedInt.make<I32>({
  name: "I32",
  bits: 32,
  signed: true
})
