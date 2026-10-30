/**
 * Complex numbers over IEEE 754 doubles (Rust's `num-complex`
 * `Complex64`).
 *
 * @example
 * ```ts
 * import { Complex } from "effect-numeric"
 *
 * const z = Complex.make(3, 4)
 * Complex.abs(z)                          // 5
 * Complex.toString(Complex.mul(z, Complex.i)) // "-4+3i"
 * Complex.exp(Complex.make(0, Math.PI))   // ≈ -1
 * ```
 *
 * @since 0.1.0
 */
import * as Equal from "effect/Equal"
import type * as Eqv from "effect/Equivalence"
import * as Hash from "effect/Hash"
import type { Pipeable } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import { powBySquaring } from "./internal/iterate.ts"
import { Value } from "./internal/value.ts"
import { type Fractional, type Operator, operator } from "./Num.ts"

const TypeId = "~effect-numeric/Complex"

/**
 * A complex number `re + im·i`.
 *
 * Two complex numbers are `Equal` when both parts are identical according
 * to `Object.is` (so `NaN` equals `NaN`).
 *
 * @category models
 * @since 0.1.0
 */
export interface Complex extends Equal.Equal, Pipeable {
  readonly [TypeId]: typeof TypeId
  readonly re: number
  readonly im: number
  /** The value's canonical text form, as returned by `toString` (and used by `String(value)`). */
  toString(): string
}

/** Only `ComplexImpl` instances carry `TypeId`, so its presence identifies a {@link Complex}. */
const hasTypeId = <T>(u: T): u is T & Complex => Predicate.hasProperty(u, TypeId)

class ComplexImpl extends Value implements Complex {
  readonly [TypeId] = TypeId
  readonly re: number
  readonly im: number
  constructor(re: number, im: number) {
    super()
    this.re = re
    this.im = im
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    return hasTypeId(that) && Object.is(that.re, this.re) && Object.is(that.im, this.im)
  }
  [Hash.symbol](): number {
    return Hash.combine(Hash.number(this.re))(Hash.number(this.im))
  }
  toString(): string {
    const im = this.im
    const sign = im < 0 || Object.is(im, -0) ? "-" : "+"
    return `${this.re}${sign}${Math.abs(im)}i`
  }
  toJSON() {
    return { _id: "Complex", re: this.re, im: this.im }
  }
}

/**
 * @category guards
 * @since 0.1.0
 */
export const isComplex = (u: unknown): u is Complex => hasTypeId(u)

/**
 * @category constructors
 * @since 0.1.0
 */
export const make = (re: number, im = 0): Complex => new ComplexImpl(re, im)

/**
 * Builds a complex number from polar coordinates.
 *
 * @category constructors
 * @since 0.1.0
 */
export const fromPolar = (r: number, theta: number): Complex => make(r * Math.cos(theta), r * Math.sin(theta))

/**
 * @category constants
 * @since 0.1.0
 */
export const zero: Complex = make(0, 0)

/**
 * @category constants
 * @since 0.1.0
 */
export const one: Complex = make(1, 0)

/**
 * The imaginary unit.
 *
 * @category constants
 * @since 0.1.0
 */
export const i: Complex = make(0, 1)

// -----------------------------------------------------------------------------
// arithmetic
// -----------------------------------------------------------------------------

/** @category math @since 0.1.0 */
export const add: Operator<Complex> = operator((a: Complex, b: Complex) => make(a.re + b.re, a.im + b.im))

/** @category math @since 0.1.0 */
export const sub: Operator<Complex> = operator((a: Complex, b: Complex) => make(a.re - b.re, a.im - b.im))

/** @category math @since 0.1.0 */
export const mul: Operator<Complex> = operator((a: Complex, b: Complex) =>
  make(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
)

/**
 * Division using Smith's algorithm to avoid unnecessary overflow. Division
 * by zero yields non-finite components, as with IEEE floats.
 *
 * @category math
 * @since 0.1.0
 */
export const div: Operator<Complex> = operator((a: Complex, b: Complex) => {
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re
    const d = b.re + b.im * r
    return b.im === 0 ? make(a.re / b.re, a.im / b.re) : make((a.re + a.im * r) / d, (a.im - a.re * r) / d)
  }
  const r = b.re / b.im
  const d = b.re * r + b.im
  return make((a.re * r + a.im) / d, (a.im * r - a.re) / d)
})

/** Multiplies by a real scalar. @category math @since 0.1.0 */
export const scale: Operator<Complex, number, Complex> = operator((a: Complex, k: number) => make(a.re * k, a.im * k))

/** @category math @since 0.1.0 */
export const negate = (a: Complex): Complex => make(-a.re, -a.im)

/** Complex conjugate. @category math @since 0.1.0 */
export const conj = (a: Complex): Complex => make(a.re, -a.im)

/** `1 / a`. @category math @since 0.1.0 */
export const recip = (a: Complex): Complex => div(one, a)

/** The modulus `|a|` (Rust's `norm`). @category math @since 0.1.0 */
export const abs = (a: Complex): number => Math.hypot(a.re, a.im)

/** `|a|²`, cheaper than {@link abs}. @category math @since 0.1.0 */
export const normSqr = (a: Complex): number => a.re * a.re + a.im * a.im

/** The argument (phase) in `(-π, π]`. @category math @since 0.1.0 */
export const arg = (a: Complex): number => Math.atan2(a.im, a.re)

/** `[r, θ]`. @category conversions @since 0.1.0 */
export const toPolar = (a: Complex): readonly [number, number] => [abs(a), arg(a)]

/** @category math @since 0.1.0 */
export const exp = (a: Complex): Complex => fromPolar(Math.exp(a.re), a.im)

/** Principal natural logarithm. @category math @since 0.1.0 */
export const ln = (a: Complex): Complex => make(Math.log(abs(a)), arg(a))

/** Principal square root. @category math @since 0.1.0 */
export const sqrt = (a: Complex): Complex => {
  if (a.im === 0) {
    return a.re >= 0 ? make(Math.sqrt(a.re), a.im) : make(0, Math.sqrt(-a.re) * (Object.is(a.im, -0) ? -1 : 1))
  }
  const m = abs(a)
  const re = Math.sqrt((m + a.re) / 2)
  const im = Math.sqrt((m - a.re) / 2)
  return make(re, a.im < 0 ? -im : im)
}

/** Raises to an integer power by repeated squaring. @category math @since 0.1.0 */
export const powi: Operator<Complex, number, Complex> = operator((a: Complex, n: number) => {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Complex.powi: exponent must be a safe integer, got ${n}`)
  return powBySquaring(one, (x: Complex, y: Complex) => mul(x, y), n < 0 ? recip(a) : a, Math.abs(n))
})

/** Raises to a real power (principal branch). @category math @since 0.1.0 */
export const powf: Operator<Complex, number, Complex> = operator((a: Complex, x: number) => {
  if (a.re === 0 && a.im === 0) return x === 0 ? one : zero
  const [r, theta] = toPolar(a)
  return fromPolar(r ** x, theta * x)
})

/** Raises to a complex power (principal branch). @category math @since 0.1.0 */
export const powc: Operator<Complex> = operator((a: Complex, b: Complex) => {
  if (a.re === 0 && a.im === 0) return b.re === 0 && b.im === 0 ? one : zero
  return exp(mul(b, ln(a)))
})

/** @category math @since 0.1.0 */
export const sin = (a: Complex): Complex => make(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im))

/** @category math @since 0.1.0 */
export const cos = (a: Complex): Complex => make(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im))

/** @category math @since 0.1.0 */
export const tan = (a: Complex): Complex => div(sin(a), cos(a))

/** @category math @since 0.1.0 */
export const sinh = (a: Complex): Complex => make(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im))

/** @category math @since 0.1.0 */
export const cosh = (a: Complex): Complex => make(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im))

/** @category math @since 0.1.0 */
export const tanh = (a: Complex): Complex => div(sinh(a), cosh(a))

// -----------------------------------------------------------------------------
// predicates & comparison
// -----------------------------------------------------------------------------

/** @category predicates @since 0.1.0 */
export const isNaN = (a: Complex): boolean => Number.isNaN(a.re) || Number.isNaN(a.im)

/** @category predicates @since 0.1.0 */
export const isFinite = (a: Complex): boolean => Number.isFinite(a.re) && Number.isFinite(a.im)

/** @category predicates @since 0.1.0 */
export const isReal = (a: Complex): boolean => a.im === 0

/**
 * Exact equality of both parts (`+0` equals `-0`; `NaN` never equals anything).
 *
 * @category comparison
 * @since 0.1.0
 */
export const Equivalence: Eqv.Equivalence<Complex> = (a, b) => a.re === b.re && a.im === b.im

/**
 * Equality up to an absolute tolerance on the distance `|a - b|`.
 *
 * @category comparison
 * @since 0.1.0
 */
export const approxEquals =
  (epsilon = 1e-12): Eqv.Equivalence<Complex> =>
  (a, b) =>
    abs(sub(a, b)) <= epsilon

/** `"re+imi"`. @category conversions @since 0.1.0 */
export const toString = (a: Complex): string => a.toString()

// -----------------------------------------------------------------------------
// schemas & instances
// -----------------------------------------------------------------------------

/**
 * Schema for `Complex` values (no encoding).
 *
 * @category schemas
 * @since 0.1.0
 */
export const schema: Schema.Codec<Complex> = Schema.declare(isComplex, { identifier: "Complex" })

/**
 * The type {@link schema} decodes to.
 *
 * @category schemas
 * @since 0.1.0
 */
export type schema = typeof schema.Type

/**
 * Schema encoding a complex number as `{ re, im }`.
 *
 * @category schemas
 * @since 0.1.0
 */
export const schemaFromStruct: Schema.Codec<Complex, { readonly re: number; readonly im: number }> = Schema.Struct({
  re: Schema.Number,
  im: Schema.Number
}).pipe(
  Schema.decodeTo(schema, {
    decode: SchemaGetter.transform((s: { readonly re: number; readonly im: number }) => make(s.re, s.im)),
    encode: SchemaGetter.transform((c: Complex) => ({ re: c.re, im: c.im }))
  })
)

/**
 * The type {@link schemaFromStruct} decodes to.
 *
 * @category schemas
 * @since 0.1.0
 */
export type schemaFromStruct = typeof schemaFromStruct.Type

/**
 * Type class instance for complex numbers.
 *
 * @category instances
 * @since 0.1.0
 */
export const Field: Fractional<Complex> = {
  zero,
  one,
  isZero: (a) => a.re === 0 && a.im === 0,
  isOne: (a) => a.re === 1 && a.im === 0,
  Equivalence,
  add,
  sub,
  mul,
  div,
  recip
}
