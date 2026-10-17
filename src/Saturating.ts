/**
 * Saturating arithmetic, equivalent to Rust's `Saturating<T>`.
 *
 * Operations clamp to the type's `MIN` / `MAX` instead of overflowing.
 *
 * @example
 * ```ts
 * import { I8, Saturating } from "effect-numeric"
 *
 * const S = Saturating.I8
 * S.add(I8.make(100), I8.make(100)) // 127
 * S.mul(I8.make(-100), I8.make(2))  // -128
 * ```
 *
 * @since 0.1.0
 */
import type * as FixedInt from "./FixedInt.ts"
import * as I8_ from "./I8.ts"
import * as I16_ from "./I16.ts"
import * as I32_ from "./I32.ts"
import * as I64_ from "./I64.ts"
import * as I128_ from "./I128.ts"
import type { Bounded, Integral, Operator, Signed } from "./Num.ts"
import * as U8_ from "./U8.ts"
import * as U16_ from "./U16.ts"
import * as U32_ from "./U32.ts"
import * as U64_ from "./U64.ts"
import * as U128_ from "./U128.ts"

/**
 * Type class for saturating arithmetic.
 *
 * Division by zero throws a `DivisionByZeroError`.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface SaturatingOps<A> {
  readonly saturatingAdd: Operator<A>
  readonly saturatingSub: Operator<A>
  readonly saturatingMul: Operator<A>
  readonly saturatingDiv: Operator<A>
  readonly saturatingPow: Operator<A, number, A>
}

/**
 * A fixed-width integer whose arithmetic saturates at the bounds of the type.
 *
 * Note that saturating arithmetic is not associative:
 * `(MAX + 1) - 1 !== MAX + (1 - 1)`.
 *
 * @category models
 * @since 0.1.0
 */
export interface SaturatingInt<A> extends Integral<A>, Signed<A>, Bounded<A> {
  readonly pow: Operator<A, number, A>
  /** Converts any integer (or truncates any float) into the type by clamping. */
  readonly from: (value: number | bigint) => A
}

/**
 * Builds a {@link SaturatingInt} instance from a fixed-width integer module.
 *
 * The remainder never overflows mathematically (`MIN % -1 === 0`), so `rem`
 * uses wrapping semantics.
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = <A extends number | bigint>(T: FixedInt.FixedInt<A, any>): SaturatingInt<A> => ({
  zero: T.zero,
  one: T.one,
  minValue: T.MIN,
  maxValue: T.MAX,
  isZero: T.isZero,
  isOne: T.isOne,
  Equivalence: T.Equivalence,
  Order: T.Order,
  add: T.saturatingAdd,
  sub: T.saturatingSub,
  mul: T.saturatingMul,
  div: T.saturatingDiv,
  rem: T.wrappingRem,
  negate: T.saturatingNeg,
  abs: T.saturatingAbs,
  signum: T.signum,
  pow: T.saturatingPow,
  from: T.saturatingFrom
})

/**
 * Sums an iterable with saturating addition.
 *
 * @category folding
 * @since 0.1.0
 */
export const sum =
  <A>(T: SaturatingOps<A> & { readonly zero: A }) =>
  (values: Iterable<A>): A => {
    let acc = T.zero
    for (const a of values) acc = T.saturatingAdd(acc, a)
    return acc
  }

/**
 * Saturating arithmetic for `I8` (Rust's `Saturating<i8>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I8: SaturatingInt<I8_.I8> = /* @__PURE__ */ make(I8_.I8)

/**
 * Saturating arithmetic for `I16` (Rust's `Saturating<i16>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I16: SaturatingInt<I16_.I16> = /* @__PURE__ */ make(I16_.I16)

/**
 * Saturating arithmetic for `I32` (Rust's `Saturating<i32>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I32: SaturatingInt<I32_.I32> = /* @__PURE__ */ make(I32_.I32)

/**
 * Saturating arithmetic for `I64` (Rust's `Saturating<i64>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I64: SaturatingInt<I64_.I64> = /* @__PURE__ */ make(I64_.I64)

/**
 * Saturating arithmetic for `I128` (Rust's `Saturating<i128>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I128: SaturatingInt<I128_.I128> = /* @__PURE__ */ make(I128_.I128)

/**
 * Saturating arithmetic for `U8` (Rust's `Saturating<u8>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U8: SaturatingInt<U8_.U8> = /* @__PURE__ */ make(U8_.U8)

/**
 * Saturating arithmetic for `U16` (Rust's `Saturating<u16>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U16: SaturatingInt<U16_.U16> = /* @__PURE__ */ make(U16_.U16)

/**
 * Saturating arithmetic for `U32` (Rust's `Saturating<u32>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U32: SaturatingInt<U32_.U32> = /* @__PURE__ */ make(U32_.U32)

/**
 * Saturating arithmetic for `U64` (Rust's `Saturating<u64>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U64: SaturatingInt<U64_.U64> = /* @__PURE__ */ make(U64_.U64)

/**
 * Saturating arithmetic for `U128` (Rust's `Saturating<u128>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U128: SaturatingInt<U128_.U128> = /* @__PURE__ */ make(U128_.U128)
