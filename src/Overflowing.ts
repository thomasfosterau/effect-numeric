/**
 * Overflowing arithmetic: operations return the wrapped result together with
 * a flag indicating whether an overflow occurred, like Rust's
 * `overflowing_*` methods.
 *
 * @example
 * ```ts
 * import { Overflowing, U8 } from "effect-numeric"
 *
 * Overflowing.U8.add(U8.make(255), U8.make(1)) // [0, true]
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
import type { Operator } from "./Num.ts"
import * as U8_ from "./U8.ts"
import * as U16_ from "./U16.ts"
import * as U32_ from "./U32.ts"
import * as U64_ from "./U64.ts"
import * as U128_ from "./U128.ts"

/**
 * Type class for overflowing arithmetic.
 *
 * Division and remainder by zero throw a `DivisionByZeroError`.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface OverflowingOps<A> {
  readonly overflowingAdd: Operator<A, A, readonly [A, boolean]>
  readonly overflowingSub: Operator<A, A, readonly [A, boolean]>
  readonly overflowingMul: Operator<A, A, readonly [A, boolean]>
  readonly overflowingDiv: Operator<A, A, readonly [A, boolean]>
  readonly overflowingRem: Operator<A, A, readonly [A, boolean]>
  readonly overflowingNeg: (self: A) => readonly [A, boolean]
  readonly overflowingPow: Operator<A, number, readonly [A, boolean]>
  /** Shifts by `n mod bits`; the flag is set if `n >= bits`. */
  readonly overflowingShl: Operator<A, number, readonly [A, boolean]>
  /** Shifts by `n mod bits`; the flag is set if `n >= bits`. */
  readonly overflowingShr: Operator<A, number, readonly [A, boolean]>
}

/**
 * An overflowing arithmetic instance.
 *
 * @category models
 * @since 0.1.0
 */
export interface Overflowing<A> {
  readonly add: Operator<A, A, readonly [A, boolean]>
  readonly sub: Operator<A, A, readonly [A, boolean]>
  readonly mul: Operator<A, A, readonly [A, boolean]>
  readonly div: Operator<A, A, readonly [A, boolean]>
  readonly rem: Operator<A, A, readonly [A, boolean]>
  readonly neg: (self: A) => readonly [A, boolean]
  readonly abs: (self: A) => readonly [A, boolean]
  readonly pow: Operator<A, number, readonly [A, boolean]>
  readonly shl: Operator<A, number, readonly [A, boolean]>
  readonly shr: Operator<A, number, readonly [A, boolean]>
  /** Wrapping sum of an iterable, flagging whether any step overflowed. */
  readonly sum: (values: Iterable<A>) => readonly [A, boolean]
}

/**
 * Wrapping sum of an iterable together with a flag indicating whether any
 * addition overflowed.
 *
 * @category folding
 * @since 0.1.0
 */
export const sum =
  <A>(T: OverflowingOps<A> & { readonly zero: A }) =>
  (values: Iterable<A>): readonly [A, boolean] =>
    Arr.reduce<A, readonly [A, boolean]>(values, [T.zero, false], ([acc, overflowed], a) => {
      const [next, o] = T.overflowingAdd(acc, a)
      return [next, overflowed || o]
    })

/**
 * Builds an {@link Overflowing} instance from a fixed-width integer module.
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = <A extends number | bigint>(T: FixedInt.FixedInt<A, any>): Overflowing<A> => ({
  add: T.overflowingAdd,
  sub: T.overflowingSub,
  mul: T.overflowingMul,
  div: T.overflowingDiv,
  rem: T.overflowingRem,
  neg: T.overflowingNeg,
  abs: T.overflowingAbs,
  pow: T.overflowingPow,
  shl: T.overflowingShl,
  shr: T.overflowingShr,
  sum: sum(T)
})

/**
 * Overflowing arithmetic for `I8`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I8: Overflowing<I8_.I8> = /* @__PURE__ */ make(I8_.I8)

/**
 * Overflowing arithmetic for `I16`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I16: Overflowing<I16_.I16> = /* @__PURE__ */ make(I16_.I16)

/**
 * Overflowing arithmetic for `I32`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I32: Overflowing<I32_.I32> = /* @__PURE__ */ make(I32_.I32)

/**
 * Overflowing arithmetic for `I64`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I64: Overflowing<I64_.I64> = /* @__PURE__ */ make(I64_.I64)

/**
 * Overflowing arithmetic for `I128`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I128: Overflowing<I128_.I128> = /* @__PURE__ */ make(I128_.I128)

/**
 * Overflowing arithmetic for `U8`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U8: Overflowing<U8_.U8> = /* @__PURE__ */ make(U8_.U8)

/**
 * Overflowing arithmetic for `U16`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U16: Overflowing<U16_.U16> = /* @__PURE__ */ make(U16_.U16)

/**
 * Overflowing arithmetic for `U32`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U32: Overflowing<U32_.U32> = /* @__PURE__ */ make(U32_.U32)

/**
 * Overflowing arithmetic for `U64`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U64: Overflowing<U64_.U64> = /* @__PURE__ */ make(U64_.U64)

/**
 * Overflowing arithmetic for `U128`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U128: Overflowing<U128_.U128> = /* @__PURE__ */ make(U128_.U128)
