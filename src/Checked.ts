/**
 * Checked arithmetic: operations that return `Option.none()` instead of
 * overflowing, dividing by zero, or shifting out of range.
 *
 * Corresponds to Rust's `checked_*` methods and the `CheckedAdd`,
 * `CheckedSub`, … traits of `num-traits`.
 *
 * @example
 * ```ts
 * import { Checked, U8 } from "effect-numeric"
 *
 * U8.checkedAdd(U8.make(200), U8.make(100)) // Option.none()
 * Checked.sum(U8)([U8.make(1), U8.make(2)]) // Option.some(3)
 * ```
 *
 * @since 0.1.0
 */
import * as Option from "effect/Option"
import type * as FixedInt from "./FixedInt.ts"
import * as I8_ from "./I8.ts"
import * as I16_ from "./I16.ts"
import * as I32_ from "./I32.ts"
import * as I64_ from "./I64.ts"
import * as I128_ from "./I128.ts"
import type { One, Operator, Zero } from "./Num.ts"
import * as U8_ from "./U8.ts"
import * as U16_ from "./U16.ts"
import * as U32_ from "./U32.ts"
import * as U64_ from "./U64.ts"
import * as U128_ from "./U128.ts"

/**
 * Type class for checked arithmetic.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface CheckedOps<A> {
  readonly checkedAdd: Operator<A, A, Option.Option<A>>
  readonly checkedSub: Operator<A, A, Option.Option<A>>
  readonly checkedMul: Operator<A, A, Option.Option<A>>
  /** `None` on division by zero or overflow. */
  readonly checkedDiv: Operator<A, A, Option.Option<A>>
  /** `None` on division by zero or overflow. */
  readonly checkedRem: Operator<A, A, Option.Option<A>>
  readonly checkedNeg: (self: A) => Option.Option<A>
  readonly checkedPow: Operator<A, number, Option.Option<A>>
  /** `None` if the shift amount is not less than the bit width. */
  readonly checkedShl: Operator<A, number, Option.Option<A>>
  /** `None` if the shift amount is not less than the bit width. */
  readonly checkedShr: Operator<A, number, Option.Option<A>>
}

/**
 * A checked arithmetic instance: every operation returns an `Option`.
 *
 * @category models
 * @since 0.1.0
 */
export interface Checked<A> {
  readonly add: Operator<A, A, Option.Option<A>>
  readonly sub: Operator<A, A, Option.Option<A>>
  readonly mul: Operator<A, A, Option.Option<A>>
  readonly div: Operator<A, A, Option.Option<A>>
  readonly rem: Operator<A, A, Option.Option<A>>
  readonly neg: (self: A) => Option.Option<A>
  readonly abs: (self: A) => Option.Option<A>
  readonly pow: Operator<A, number, Option.Option<A>>
  readonly shl: Operator<A, number, Option.Option<A>>
  readonly shr: Operator<A, number, Option.Option<A>>
  /** Sums an iterable, returning `None` as soon as an addition overflows. */
  readonly sum: (values: Iterable<A>) => Option.Option<A>
  /** Multiplies an iterable, returning `None` as soon as a multiplication overflows. */
  readonly product: (values: Iterable<A>) => Option.Option<A>
}

/**
 * Sums an iterable with checked addition, short-circuiting on overflow.
 *
 * @category folding
 * @since 0.1.0
 */
export const sum =
  <A>(T: CheckedOps<A> & Zero<A>) =>
  (values: Iterable<A>): Option.Option<A> => {
    let acc = T.zero
    for (const a of values) {
      const next = T.checkedAdd(acc, a)
      if (Option.isNone(next)) return next
      acc = next.value
    }
    return Option.some(acc)
  }

/**
 * Multiplies an iterable with checked multiplication, short-circuiting on
 * overflow.
 *
 * @category folding
 * @since 0.1.0
 */
export const product =
  <A>(T: CheckedOps<A> & One<A>) =>
  (values: Iterable<A>): Option.Option<A> => {
    let acc = T.one
    for (const a of values) {
      const next = T.checkedMul(acc, a)
      if (Option.isNone(next)) return next
      acc = next.value
    }
    return Option.some(acc)
  }

/**
 * Builds a {@link Checked} instance from a fixed-width integer module.
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = <A extends number | bigint>(T: FixedInt.FixedInt<A, any>): Checked<A> => ({
  add: T.checkedAdd,
  sub: T.checkedSub,
  mul: T.checkedMul,
  div: T.checkedDiv,
  rem: T.checkedRem,
  neg: T.checkedNeg,
  abs: T.checkedAbs,
  pow: T.checkedPow,
  shl: T.checkedShl,
  shr: T.checkedShr,
  sum: sum(T),
  product: product(T)
})

/**
 * Checked arithmetic for `I8`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I8: Checked<I8_.I8> = /* @__PURE__ */ make(I8_.I8)

/**
 * Checked arithmetic for `I16`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I16: Checked<I16_.I16> = /* @__PURE__ */ make(I16_.I16)

/**
 * Checked arithmetic for `I32`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I32: Checked<I32_.I32> = /* @__PURE__ */ make(I32_.I32)

/**
 * Checked arithmetic for `I64`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I64: Checked<I64_.I64> = /* @__PURE__ */ make(I64_.I64)

/**
 * Checked arithmetic for `I128`.
 *
 * @category instances
 * @since 0.1.0
 */
export const I128: Checked<I128_.I128> = /* @__PURE__ */ make(I128_.I128)

/**
 * Checked arithmetic for `U8`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U8: Checked<U8_.U8> = /* @__PURE__ */ make(U8_.U8)

/**
 * Checked arithmetic for `U16`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U16: Checked<U16_.U16> = /* @__PURE__ */ make(U16_.U16)

/**
 * Checked arithmetic for `U32`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U32: Checked<U32_.U32> = /* @__PURE__ */ make(U32_.U32)

/**
 * Checked arithmetic for `U64`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U64: Checked<U64_.U64> = /* @__PURE__ */ make(U64_.U64)

/**
 * Checked arithmetic for `U128`.
 *
 * @category instances
 * @since 0.1.0
 */
export const U128: Checked<U128_.U128> = /* @__PURE__ */ make(U128_.U128)
