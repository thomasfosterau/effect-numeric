/**
 * Numeric type classes in the spirit of Rust's `num-traits` crate.
 *
 * A type class is a plain record of operations for some carrier type `A`.
 * Generic algorithms (see {@link sum}, {@link product}, {@link pow}, and the
 * `Integer` module) are written against these interfaces, and every numeric
 * type in this library ships instances for them.
 *
 * All binary operations are *dual*: they can be called data-first
 * (`N.add(a, b)`) or data-last for use with `pipe` (`pipe(a, N.add(b))`).
 *
 * Operations on type class instances are total. Where an operation is
 * undefined (integer division by zero), instances throw a
 * `DivisionByZeroError`, mirroring a Rust panic; use the `Option`/`Result`
 * returning functions on concrete modules to handle these cases as values.
 *
 * @since 0.1.0
 */
import type * as Equivalence from "effect/Equivalence"
import * as EqvMod from "effect/Equivalence"
import { dual } from "effect/Function"
import type * as Option from "effect/Option"
import * as Order from "effect/Order"
import { DivisionByZeroError } from "./ArithmeticError.ts"

/**
 * A dual binary operator taking a `Self` and a `That` and returning `Out`.
 *
 * @category models
 * @since 0.1.0
 */
export interface Operator<Self, That = Self, Out = Self> {
  (that: That): (self: Self) => Out
  (self: Self, that: That): Out
}

/**
 * Builds a dual {@link Operator} from a data-first function.
 *
 * @category constructors
 * @since 0.1.0
 */
export const operator = <Self, That, Out>(f: (self: Self, that: That) => Out): Operator<Self, That, Out> => dual(2, f)

/**
 * Types with an additive identity.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Zero<A> {
  readonly zero: A
  readonly isZero: (self: A) => boolean
}

/**
 * Types with a multiplicative identity.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface One<A> {
  readonly one: A
  readonly isOne: (self: A) => boolean
}

/**
 * Types with a smallest and largest value.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Bounded<A> {
  readonly minValue: A
  readonly maxValue: A
}

/**
 * The base numeric type class: a ring-like structure with addition,
 * subtraction, multiplication and their identities.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Num<A> extends Zero<A>, One<A> {
  readonly Equivalence: Equivalence.Equivalence<A>
  readonly add: Operator<A>
  readonly sub: Operator<A>
  readonly mul: Operator<A>
}

/**
 * A {@link Num} whose values are totally ordered.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface OrderedNum<A> extends Num<A> {
  readonly Order: Order.Order<A>
}

/**
 * Numbers with a sign: negation, absolute value and signum.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Signed<A> extends Num<A> {
  readonly negate: (self: A) => A
  readonly abs: (self: A) => A
  /** `-1`, `0` or `1` (or the type's equivalent) depending on the sign. */
  readonly signum: (self: A) => A
}

/**
 * Integers: truncating division and remainder.
 *
 * `div` rounds toward zero and `rem` has the sign of the dividend, matching
 * Rust's `/` and `%` on integers.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Integral<A> extends OrderedNum<A> {
  readonly div: Operator<A>
  readonly rem: Operator<A>
}

/**
 * Types with a total division operation (fields such as rationals, or
 * floating point numbers).
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Fractional<A> extends Num<A> {
  readonly div: Operator<A>
  readonly recip: (self: A) => A
}

/**
 * Lossy conversion to and from JavaScript primitives.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface FromPrimitive<A> {
  /** Converts if the value is exactly representable. */
  readonly from: (value: number | bigint) => Option.Option<A>
}

/**
 * Conversion to JavaScript primitives.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface ToPrimitive<A> {
  readonly toNumber: (self: A) => number
}

// -----------------------------------------------------------------------------
// generic algorithms
// -----------------------------------------------------------------------------

/**
 * Sums all values in an iterable, starting from `zero`.
 *
 * @example
 * ```ts
 * import { Num } from "effect-numeric"
 *
 * Num.sum(Num.number)([1, 2, 3]) // 6
 * ```
 *
 * @category folding
 * @since 0.1.0
 */
export const sum =
  <A>(N: Num<A>) =>
  (values: Iterable<A>): A => {
    let acc = N.zero
    for (const a of values) acc = N.add(acc, a)
    return acc
  }

/**
 * Multiplies all values in an iterable, starting from `one`.
 *
 * @category folding
 * @since 0.1.0
 */
export const product =
  <A>(N: Num<A>) =>
  (values: Iterable<A>): A => {
    let acc = N.one
    for (const a of values) acc = N.mul(acc, a)
    return acc
  }

/**
 * Raises `self` to a non-negative integer power using exponentiation by
 * squaring (`O(log exp)` multiplications).
 *
 * @category math
 * @since 0.1.0
 */
export const pow = <A>(N: Num<A>): Operator<A, number, A> =>
  operator((self: A, exp: number): A => {
    if (!Number.isSafeInteger(exp) || exp < 0) {
      throw new RangeError(`pow: exponent must be a non-negative safe integer, got ${exp}`)
    }
    let result = N.one
    let base = self
    let e = exp
    while (e > 0) {
      if (e % 2 === 1) result = N.mul(result, base)
      e = Math.floor(e / 2)
      if (e > 0) base = N.mul(base, base)
    }
    return result
  })

/**
 * Squares a value.
 *
 * @category math
 * @since 0.1.0
 */
export const square =
  <A>(N: Num<A>) =>
  (self: A): A =>
    N.mul(self, self)

/**
 * Computes `self * a + b`.
 *
 * @category math
 * @since 0.1.0
 */
export const mulAdd =
  <A>(N: Num<A>) =>
  (self: A, a: A, b: A): A =>
    N.add(N.mul(self, a), b)

/**
 * @category predicates
 * @since 0.1.0
 */
export const isPositive =
  <A>(N: OrderedNum<A>) =>
  (self: A): boolean =>
    N.Order(self, N.zero) > 0

/**
 * @category predicates
 * @since 0.1.0
 */
export const isNegative =
  <A>(N: OrderedNum<A>) =>
  (self: A): boolean =>
    N.Order(self, N.zero) < 0

/**
 * Restricts a value to the closed range of a {@link Bounded} type with an order.
 *
 * @category math
 * @since 0.1.0
 */
export const clamp =
  <A>(O: Order.Order<A>, minimum: NoInfer<A>, maximum: NoInfer<A>) =>
  (self: A): A =>
    Order.clamp(O)(self, { minimum, maximum })

// -----------------------------------------------------------------------------
// instances
// -----------------------------------------------------------------------------

/**
 * Instance for JavaScript `number` (IEEE 754 double precision) arithmetic.
 *
 * Division follows IEEE semantics (`1 / 0 === Infinity`).
 *
 * @category instances
 * @since 0.1.0
 */
export const number: OrderedNum<number> & Signed<number> & Fractional<number> & Bounded<number> = {
  zero: 0,
  one: 1,
  minValue: Number.NEGATIVE_INFINITY,
  maxValue: Number.POSITIVE_INFINITY,
  isZero: (self) => self === 0,
  isOne: (self) => self === 1,
  Equivalence: EqvMod.Number,
  Order: Order.Number,
  add: operator((a: number, b: number) => a + b),
  sub: operator((a: number, b: number) => a - b),
  mul: operator((a: number, b: number) => a * b),
  div: operator((a: number, b: number) => a / b),
  recip: (self) => 1 / self,
  negate: (self) => -self,
  abs: Math.abs,
  signum: (self) => (Number.isNaN(self) ? Number.NaN : self > 0 ? 1 : self < 0 ? -1 : self)
}

/**
 * Instance for arbitrary precision `bigint` integers (Rust's `num-bigint`).
 *
 * Division by zero throws a `DivisionByZeroError`.
 *
 * @category instances
 * @since 0.1.0
 */
export const bigint: Integral<bigint> & Signed<bigint> = {
  zero: 0n,
  one: 1n,
  isZero: (self) => self === 0n,
  isOne: (self) => self === 1n,
  Equivalence: EqvMod.BigInt,
  Order: Order.BigInt,
  add: operator((a: bigint, b: bigint) => a + b),
  sub: operator((a: bigint, b: bigint) => a - b),
  mul: operator((a: bigint, b: bigint) => a * b),
  div: operator((a: bigint, b: bigint) => {
    if (b === 0n) throw new DivisionByZeroError({ operation: "divide", type: "bigint" })
    return a / b
  }),
  rem: operator((a: bigint, b: bigint) => {
    if (b === 0n) throw new DivisionByZeroError({ operation: "calculate the remainder", type: "bigint" })
    return a % b
  }),
  negate: (self) => -self,
  abs: (self) => (self < 0n ? -self : self),
  signum: (self) => (self > 0n ? 1n : self < 0n ? -1n : 0n)
}
