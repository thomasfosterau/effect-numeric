/**
 * Floating point numbers: the `Float` type class (Rust's `num_traits::Float`),
 * the {@link F64} instance for JavaScript numbers, IEEE 754 total ordering,
 * and the {@link NotNaN} / {@link Finite} refinements (in the spirit of the
 * `ordered-float` crate).
 *
 * @example
 * ```ts
 * import { Float } from "effect-numeric"
 * import { Array } from "effect"
 *
 * Array.sort([3, Number.NaN, -0, 0, -1], Float.F64.Order) // [-1, -0, 0, 3, NaN]
 * Float.F64.roundTiesEven(2.5)                            // 2
 * Float.F64.nextUp(1)                                     // 1.0000000000000002
 * ```
 *
 * @since 0.1.0
 */
import * as Brand from "effect/Brand"
import type * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Schema from "effect/Schema"
import { brandAs, unbranded, unsafeBrand } from "./internal/brand.ts"
import { type Bounded, type Fractional, type Operator, type OrderedNum, operator, type Signed } from "./Num.ts"

/**
 * Type class for floating point numbers.
 *
 * `Order` is the IEEE 754 `totalOrder` predicate (`-Infinity < … < -0 < +0
 * < … < Infinity < NaN`) and `Equivalence` agrees with it, so both are
 * lawful even in the presence of `NaN`. Use `Num.number` for plain `<`
 * semantics.
 *
 * @category type classes
 * @since 0.1.0
 */
export interface Float<A> extends OrderedNum<A>, Signed<A>, Fractional<A>, Bounded<A> {
  /** The number of significand bits, including the implicit bit. */
  readonly mantissaDigits: number
  readonly nan: A
  readonly infinity: A
  readonly negInfinity: A
  readonly negZero: A
  /** The difference between `1` and the next representable value. */
  readonly epsilon: A
  /** The smallest positive normal value. */
  readonly minPositive: A
  /** The largest finite value. */
  readonly maxFinite: A
  /** Rounds an arbitrary number to the nearest value of this type. */
  readonly from: (n: number) => A

  readonly isNaN: (self: A) => boolean
  readonly isFinite: (self: A) => boolean
  readonly isInfinite: (self: A) => boolean
  /** Neither zero, infinite, subnormal nor `NaN`. */
  readonly isNormal: (self: A) => boolean
  readonly isSubnormal: (self: A) => boolean
  /** `true` for `+0`, positive numbers and `+Infinity`. */
  readonly isSignPositive: (self: A) => boolean
  /** `true` for `-0`, negative numbers and `-Infinity`. */
  readonly isSignNegative: (self: A) => boolean

  readonly floor: (self: A) => A
  readonly ceil: (self: A) => A
  /** Rounds half-way cases away from zero (Rust's `round`). */
  readonly round: (self: A) => A
  /** Rounds half-way cases to the nearest even integer. */
  readonly roundTiesEven: (self: A) => A
  readonly trunc: (self: A) => A
  /** `self - trunc(self)`. */
  readonly fract: (self: A) => A
  readonly sqrt: (self: A) => A
  readonly cbrt: (self: A) => A
  readonly exp: (self: A) => A
  readonly exp2: (self: A) => A
  readonly expm1: (self: A) => A
  readonly ln: (self: A) => A
  readonly ln1p: (self: A) => A
  readonly log2: (self: A) => A
  readonly log10: (self: A) => A
  /** Logarithm in an arbitrary base. */
  readonly log: Operator<A>
  /** Raises to an integer power. */
  readonly powi: Operator<A, number, A>
  readonly powf: Operator<A>
  readonly hypot: Operator<A>
  readonly atan2: Operator<A>
  /** The magnitude of `self` with the sign of `sign`. */
  readonly copysign: Operator<A>
  readonly sin: (self: A) => A
  readonly cos: (self: A) => A
  readonly tan: (self: A) => A
  readonly asin: (self: A) => A
  readonly acos: (self: A) => A
  readonly atan: (self: A) => A
  readonly sinh: (self: A) => A
  readonly cosh: (self: A) => A
  readonly tanh: (self: A) => A
  readonly asinh: (self: A) => A
  readonly acosh: (self: A) => A
  readonly atanh: (self: A) => A
  /** `self * a + b`. */
  readonly mulAdd: (self: A, a: A, b: A) => A
  readonly toDegrees: (self: A) => A
  readonly toRadians: (self: A) => A
  /** The least value greater than `self`. */
  readonly nextUp: (self: A) => A
  /** The greatest value less than `self`. */
  readonly nextDown: (self: A) => A
  /** Minimum, ignoring `NaN` (IEEE `minNum`). */
  readonly min: Operator<A>
  /** Maximum, ignoring `NaN` (IEEE `maxNum`). */
  readonly max: Operator<A>
  /** Restricts to `[minimum, maximum]`; `NaN` stays `NaN`. */
  readonly clamp: (self: A, minimum: A, maximum: A) => A
}

/**
 * IEEE 754 `totalOrder`: `-Infinity < … < -0 < +0 < … < Infinity < NaN`.
 *
 * @category ordering
 * @since 0.1.0
 */
export const totalOrder: Order.Order<number> = (a, b) => {
  const an = Number.isNaN(a)
  const bn = Number.isNaN(b)
  if (an || bn) return an && bn ? 0 : an ? 1 : -1
  if (a < b) return -1
  if (a > b) return 1
  if (a === 0) {
    const az = Object.is(a, -0)
    const bz = Object.is(b, -0)
    return az === bz ? 0 : az ? -1 : 1
  }
  return 0
}

/** Rounds half away from zero (`Math.round` rounds half toward +∞). */
const roundAway = (n: number) => (n < 0 ? -Math.round(-n) : Math.round(n))

/** Rounds half to even (banker's rounding). */
const roundTiesEven = (n: number) => (Math.abs(n % 1) === 0.5 ? 2 * Math.round(n / 2) : Math.round(n))

/** @internal */
export const makeFloat = <A extends number>(config: {
  readonly round: (n: number) => number
  readonly mantissaDigits: number
  readonly epsilon: number
  readonly minPositive: number
  readonly maxFinite: number
  readonly nextUp: (n: number) => number
}): Float<A> => {
  /** Brands a number that is already a value of the type. */
  const value = (n: number): A =>
    // SAFETY: every caller passes a number the type represents exactly: the
    // output of `config.round` or `config.nextUp`, the negation of a value
    // (exact in IEEE 754), or one of the constants below (0, 1, ±0, ±Infinity,
    // NaN and the type's own epsilon / minPositive / maxFinite).
    unsafeBrand<A, number>(n)
  const r = (n: number): A => value(config.round(n))
  const u =
    (f: (n: number) => number) =>
    (a: A): A =>
      r(f(a))
  const b = (f: (x: number, y: number) => number): Operator<A> => operator((x: A, y: A) => r(f(x, y)))
  const nextUp = (n: A): A => value(config.nextUp(n))
  const nextDown = (n: A): A => value(-config.nextUp(-n))
  return {
    mantissaDigits: config.mantissaDigits,
    zero: value(0),
    one: value(1),
    nan: value(Number.NaN),
    infinity: value(Number.POSITIVE_INFINITY),
    negInfinity: value(Number.NEGATIVE_INFINITY),
    negZero: value(-0),
    epsilon: value(config.epsilon),
    minPositive: value(config.minPositive),
    maxFinite: value(config.maxFinite),
    minValue: value(Number.NEGATIVE_INFINITY),
    maxValue: value(Number.POSITIVE_INFINITY),
    from: r,
    isZero: (a) => a === 0,
    isOne: (a) => a === 1,
    Order: totalOrder,
    Equivalence: (x, y) => totalOrder(x, y) === 0,
    add: b((x, y) => x + y),
    sub: b((x, y) => x - y),
    mul: b((x, y) => x * y),
    div: b((x, y) => x / y),
    recip: u((x) => 1 / x),
    negate: (a) => value(-a),
    abs: u(Math.abs),
    signum: (a) => (Number.isNaN(a) ? a : value(a > 0 || Object.is(a, 0) ? 1 : -1)),
    isNaN: Number.isNaN,
    isFinite: Number.isFinite,
    isInfinite: (a) => a === Number.POSITIVE_INFINITY || a === Number.NEGATIVE_INFINITY,
    isNormal: (a) => Number.isFinite(a) && Math.abs(a) >= config.minPositive,
    isSubnormal: (a) => a !== 0 && Math.abs(a) < config.minPositive,
    isSignPositive: (a) => a > 0 || Object.is(a, 0),
    isSignNegative: (a) => a < 0 || Object.is(a, -0),
    floor: u(Math.floor),
    ceil: u(Math.ceil),
    round: u(roundAway),
    roundTiesEven: u(roundTiesEven),
    trunc: u(Math.trunc),
    fract: u((x) => x - Math.trunc(x)),
    sqrt: u(Math.sqrt),
    cbrt: u(Math.cbrt),
    exp: u(Math.exp),
    exp2: u((x) => 2 ** x),
    expm1: u(Math.expm1),
    ln: u(Math.log),
    ln1p: u(Math.log1p),
    log2: u(Math.log2),
    log10: u(Math.log10),
    log: b((x, base) => Math.log(x) / Math.log(base)),
    powi: operator((x: A, n: number) => r(x ** Math.trunc(n))),
    powf: b((x, y) => x ** y),
    hypot: b(Math.hypot),
    atan2: b(Math.atan2),
    copysign: b((x, s) => {
      const mag = Math.abs(x)
      return s < 0 || Object.is(s, -0) ? -mag : mag
    }),
    sin: u(Math.sin),
    cos: u(Math.cos),
    tan: u(Math.tan),
    asin: u(Math.asin),
    acos: u(Math.acos),
    atan: u(Math.atan),
    sinh: u(Math.sinh),
    cosh: u(Math.cosh),
    tanh: u(Math.tanh),
    asinh: u(Math.asinh),
    acosh: u(Math.acosh),
    atanh: u(Math.atanh),
    mulAdd: (x, a, c) => r(x * a + c),
    toDegrees: u((x) => (x * 180) / Math.PI),
    toRadians: u((x) => (x * Math.PI) / 180),
    nextUp,
    nextDown,
    min: operator((x: A, y: A) => (Number.isNaN(x) ? y : Number.isNaN(y) ? x : x <= y ? x : y)),
    max: operator((x: A, y: A) => (Number.isNaN(x) ? y : Number.isNaN(y) ? x : x >= y ? x : y)),
    clamp: (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x)
  }
}

const f64View = new DataView(new ArrayBuffer(8))
const nextUp64 = (n: number): number => {
  if (Number.isNaN(n) || n === Number.POSITIVE_INFINITY) return n
  if (n === 0) return Number.MIN_VALUE
  f64View.setFloat64(0, n)
  const bits = f64View.getBigInt64(0)
  f64View.setBigInt64(0, n > 0 ? bits + 1n : bits - 1n)
  return f64View.getFloat64(0)
}

/**
 * IEEE 754 double precision (`f64`) instance for JavaScript numbers.
 *
 * @category instances
 * @since 0.1.0
 */
export const F64: Float<number> = /* @__PURE__ */ makeFloat<number>({
  round: (n) => n,
  mantissaDigits: 53,
  epsilon: Number.EPSILON,
  minPositive: 2 ** -1022,
  maxFinite: Number.MAX_VALUE,
  nextUp: nextUp64
})

// -----------------------------------------------------------------------------
// NotNaN / Finite
// -----------------------------------------------------------------------------

/**
 * A number that is not `NaN`. Unlike plain numbers, `NotNaN` values have a
 * lawful total order under `<`.
 *
 * @category models
 * @since 0.1.0
 */
export type NotNaN = number & Brand.Brand<"NotNaN">

/**
 * A finite number (neither `NaN` nor infinite).
 *
 * @category models
 * @since 0.1.0
 */
export type Finite = number & Brand.Brand<"Finite">

/**
 * Operations on a refined float type. Arithmetic returns `None` when the
 * result leaves the refinement (e.g. `Infinity - Infinity` for `NotNaN`, or
 * overflow to `Infinity` for `Finite`).
 *
 * @category models
 * @since 0.1.0
 */
export interface RefinedFloat<A extends number & Brand.Brand<any>> extends Brand.Constructor<A> {
  readonly schema: Schema.Codec<A, number>
  readonly Order: Order.Order<A>
  readonly add: Operator<A, A, Option.Option<A>>
  readonly sub: Operator<A, A, Option.Option<A>>
  readonly mul: Operator<A, A, Option.Option<A>>
  readonly div: Operator<A, A, Option.Option<A>>
  /** Applies a function to the underlying number, keeping the refinement. */
  readonly map: Operator<A, (n: number) => number, Option.Option<A>>
}

const refined = <A extends number & Brand.Brand<any>>(
  name: string,
  message: string,
  ctor: Brand.Constructor<A>
): RefinedFloat<A> => {
  const lift = (f: (x: number, y: number) => number): Operator<A, A, Option.Option<A>> =>
    operator((x: A, y: A) => ctor.option(unbranded<A>(f(x, y))))
  const extra = {
    schema: brandAs<A, number>(
      Schema.Number.pipe(
        Schema.check(
          Schema.makeFilter((n: number) => ctor.is(unbranded<A>(n)) || message, {
            // The identifier names the JSON Schema definition of the encoded number.
            identifier: `${name}Encoded`,
            title: name,
            description: message
          })
        )
      ),
      name
    ),
    Order: Order.Number,
    add: lift((x, y) => x + y),
    sub: lift((x, y) => x - y),
    mul: lift((x, y) => x * y),
    div: lift((x, y) => x / y),
    map: operator((x: A, f: (n: number) => number) => ctor.option(unbranded<A>(f(x))))
  }
  const self: RefinedFloat<A> = Object.assign(
    (n: Brand.Brand.Unbranded<A>) => ctor(n),
    {
      option: (n: Brand.Brand.Unbranded<A>) => ctor.option(n),
      result: (n: Brand.Brand.Unbranded<A>) => ctor.result(n),
      is: (u: Brand.Brand.Unbranded<A>): u is Brand.Brand.Unbranded<A> & A => ctor.is(u)
    },
    extra
  )
  return self
}

/**
 * Constructor and operations for {@link NotNaN}.
 *
 * @category constructors
 * @since 0.1.0
 */
export const NotNaN: RefinedFloat<NotNaN> = /* @__PURE__ */ refined(
  "NotNaN",
  "Expected a number that is not NaN",
  Brand.make<NotNaN>((n) => !Number.isNaN(n) || "Expected a number that is not NaN")
)

/**
 * Constructor and operations for {@link Finite}.
 *
 * @category constructors
 * @since 0.1.0
 */
export const Finite: RefinedFloat<Finite> = /* @__PURE__ */ refined(
  "Finite",
  "Expected a finite number",
  Brand.make<Finite>((n) => Number.isFinite(n) || "Expected a finite number")
)
