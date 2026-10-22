/**
 * Wrapping (modular) arithmetic, equivalent to Rust's `Wrapping<T>`.
 *
 * Every operation of a {@link WrappingInt} instance wraps around at the
 * boundary of the type, so it forms a lawful {@link Integral} instance
 * (arithmetic modulo 2^bits). Use it with the generic algorithms in `Num` and
 * `Integer`, or directly:
 *
 * @example
 * ```ts
 * import { U8, Wrapping } from "effect-numeric"
 *
 * const W = Wrapping.U8
 * W.add(U8.make(250), U8.make(10)) // 4
 * W.sub(U8.make(0), U8.make(1))    // 255
 * ```
 *
 * @since 0.1.0
 */
import * as Arr from "effect/Array"
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
 * Type class for wrapping arithmetic.
 *
 * Division and remainder by zero throw a `DivisionByZeroError`.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface WrappingOps<A> {
  readonly wrappingAdd: Operator<A>
  readonly wrappingSub: Operator<A>
  readonly wrappingMul: Operator<A>
  readonly wrappingDiv: Operator<A>
  readonly wrappingRem: Operator<A>
  readonly wrappingNeg: (self: A) => A
  readonly wrappingPow: Operator<A, number, A>
  /** Shifts by `n mod bits`. */
  readonly wrappingShl: Operator<A, number, A>
  /** Shifts by `n mod bits`. */
  readonly wrappingShr: Operator<A, number, A>
}

/**
 * A fixed-width integer whose arithmetic wraps on overflow.
 *
 * @category models
 * @since 0.1.0
 */
export interface WrappingInt<A> extends Integral<A>, Signed<A>, Bounded<A> {
  readonly pow: Operator<A, number, A>
  readonly shl: Operator<A, number, A>
  readonly shr: Operator<A, number, A>
  /** Converts any integer (or truncates any float) into the type by wrapping. */
  readonly from: (value: number | bigint) => A
}

/**
 * Builds a {@link WrappingInt} instance from a fixed-width integer module.
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = <A extends number | bigint>(T: FixedInt.FixedInt<A, any>): WrappingInt<A> => ({
  zero: T.zero,
  one: T.one,
  minValue: T.MIN,
  maxValue: T.MAX,
  isZero: T.isZero,
  isOne: T.isOne,
  Equivalence: T.Equivalence,
  Order: T.Order,
  add: T.wrappingAdd,
  sub: T.wrappingSub,
  mul: T.wrappingMul,
  div: T.wrappingDiv,
  rem: T.wrappingRem,
  negate: T.wrappingNeg,
  abs: T.wrappingAbs,
  signum: T.signum,
  pow: T.wrappingPow,
  shl: T.wrappingShl,
  shr: T.wrappingShr,
  from: T.wrappingFrom
})

/**
 * Sums an iterable with wrapping addition.
 *
 * @category folding
 * @since 0.1.0
 */
export const sum =
  <A>(T: WrappingOps<A> & { readonly zero: A }) =>
  (values: Iterable<A>): A =>
    Arr.reduce(values, T.zero, (acc, a) => T.wrappingAdd(acc, a))

/**
 * Wrapping arithmetic for `I8` (Rust's `Wrapping<i8>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I8: WrappingInt<I8_.I8> = /* @__PURE__ */ make(I8_.I8)

/**
 * Wrapping arithmetic for `I16` (Rust's `Wrapping<i16>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I16: WrappingInt<I16_.I16> = /* @__PURE__ */ make(I16_.I16)

/**
 * Wrapping arithmetic for `I32` (Rust's `Wrapping<i32>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I32: WrappingInt<I32_.I32> = /* @__PURE__ */ make(I32_.I32)

/**
 * Wrapping arithmetic for `I64` (Rust's `Wrapping<i64>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I64: WrappingInt<I64_.I64> = /* @__PURE__ */ make(I64_.I64)

/**
 * Wrapping arithmetic for `I128` (Rust's `Wrapping<i128>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const I128: WrappingInt<I128_.I128> = /* @__PURE__ */ make(I128_.I128)

/**
 * Wrapping arithmetic for `U8` (Rust's `Wrapping<u8>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U8: WrappingInt<U8_.U8> = /* @__PURE__ */ make(U8_.U8)

/**
 * Wrapping arithmetic for `U16` (Rust's `Wrapping<u16>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U16: WrappingInt<U16_.U16> = /* @__PURE__ */ make(U16_.U16)

/**
 * Wrapping arithmetic for `U32` (Rust's `Wrapping<u32>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U32: WrappingInt<U32_.U32> = /* @__PURE__ */ make(U32_.U32)

/**
 * Wrapping arithmetic for `U64` (Rust's `Wrapping<u64>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U64: WrappingInt<U64_.U64> = /* @__PURE__ */ make(U64_.U64)

/**
 * Wrapping arithmetic for `U128` (Rust's `Wrapping<u128>`).
 *
 * @category instances
 * @since 0.1.0
 */
export const U128: WrappingInt<U128_.U128> = /* @__PURE__ */ make(U128_.U128)
