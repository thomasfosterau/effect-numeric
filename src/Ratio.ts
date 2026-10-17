/**
 * Exact rational numbers backed by `bigint` (Rust's `num-rational`
 * `BigRational`).
 *
 * A {@link Ratio} is always stored in lowest terms with a positive
 * denominator, so structural equality (`Equal.equals`) coincides with
 * numeric equality and ratios can be used as `HashMap` / `HashSet` keys.
 *
 * @example
 * ```ts
 * import { Ratio } from "effect-numeric"
 * import { pipe } from "effect"
 *
 * const a = Ratio.make(1, 3)
 * const b = Ratio.make(1, 6)
 *
 * Ratio.toString(Ratio.add(a, b))         // "1/2"
 * pipe(a, Ratio.mul(b), Ratio.toString)   // "1/18"
 * Ratio.approximate(Math.PI, 1000n)       // Option.some(355/113)
 * ```
 *
 * @since 0.1.0
 */
import * as Equal from "effect/Equal"
import type * as Eqv from "effect/Equivalence"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import type * as Ord from "effect/Order"
import type { Pipeable } from "effect/Pipeable"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import { DivisionByZeroError } from "./ArithmeticError.ts"
import * as big from "./internal/bigint.ts"
import { Value } from "./internal/value.ts"
import { type Fractional, type Operator, type OrderedNum, operator, type Signed } from "./Num.ts"

const TypeId = "~effect-numeric/Ratio"

/**
 * A rational number `numer / denom` in lowest terms with `denom > 0`.
 *
 * @category models
 * @since 0.1.0
 */
export interface Ratio extends Equal.Equal, Pipeable {
  readonly [TypeId]: typeof TypeId
  readonly numer: bigint
  readonly denom: bigint
}

class RatioImpl extends Value implements Ratio {
  readonly [TypeId] = TypeId
  constructor(
    readonly numer: bigint,
    readonly denom: bigint
  ) {
    super()
  }
  [Equal.symbol](that: Equal.Equal): boolean {
    return isRatio(that) && that.numer === this.numer && that.denom === this.denom
  }
  [Hash.symbol](): number {
    return Hash.string(`${this.numer}/${this.denom}`)
  }
  toString(): string {
    return this.denom === 1n ? `${this.numer}` : `${this.numer}/${this.denom}`
  }
  toJSON() {
    return { _id: "Ratio", numer: `${this.numer}`, denom: `${this.denom}` }
  }
}

const gcd = (a: bigint, b: bigint): bigint => {
  let x = big.abs(a)
  let y = big.abs(b)
  while (y !== 0n) [x, y] = [y, x % y]
  return x
}

/** Assumes `d !== 0n`. */
const reduce = (n: bigint, d: bigint): Ratio => {
  if (n === 0n) return zero
  const g = gcd(n, d)
  const s = d < 0n ? -g : g
  return new RatioImpl(n / s, d / s)
}

const toBig = (n: bigint | number, what: string): bigint => {
  const b = big.toBigIntExact(n)
  if (b === undefined) throw new RangeError(`Ratio: ${what} must be an integer, got ${n}`)
  return b
}

/**
 * @category guards
 * @since 0.1.0
 */
export const isRatio = (u: unknown): u is Ratio => typeof u === "object" && u !== null && TypeId in u

/**
 * @category constants
 * @since 0.1.0
 */
export const zero: Ratio = new RatioImpl(0n, 1n)

/**
 * @category constants
 * @since 0.1.0
 */
export const one: Ratio = new RatioImpl(1n, 1n)

/**
 * Builds a ratio from integer numerator and denominator, reducing it to
 * lowest terms. Throws a `DivisionByZeroError` if `denom` is zero.
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = (numer: bigint | number, denom: bigint | number = 1n): Ratio => {
  const d = toBig(denom, "denominator")
  if (d === 0n) throw new DivisionByZeroError({ operation: "create a ratio", type: "Ratio" })
  return reduce(toBig(numer, "numerator"), d)
}

/**
 * Like {@link make} but returns a `Result` instead of throwing.
 *
 * @category constructors
 * @since 0.1.0
 */
export const fromFraction = (numer: bigint, denom: bigint): Result.Result<Ratio, DivisionByZeroError> =>
  denom === 0n
    ? Result.fail(new DivisionByZeroError({ operation: "create a ratio", type: "Ratio" }))
    : Result.succeed(reduce(numer, denom))

/**
 * @category constructors
 * @since 0.1.0
 */
export const fromInteger = (n: bigint | number): Ratio => new RatioImpl(toBig(n, "value"), 1n)

/**
 * Converts a finite float to the rational number it represents *exactly*
 * (every finite double is a dyadic rational). `None` for `NaN` and infinities.
 *
 * @category constructors
 * @since 0.1.0
 */
export const fromNumber = (x: number): Option.Option<Ratio> => {
  if (!Number.isFinite(x)) return Option.none()
  if (Number.isInteger(x)) return Option.some(new RatioImpl(BigInt(x), 1n))
  const view = new DataView(new ArrayBuffer(8))
  view.setFloat64(0, x)
  const bits = view.getBigUint64(0)
  const negative = bits >> 63n === 1n
  const exponent = Number((bits >> 52n) & 0x7ffn)
  const fraction = bits & ((1n << 52n) - 1n)
  const mantissa = exponent === 0 ? fraction : fraction | (1n << 52n)
  const e = (exponent === 0 ? 1 : exponent) - 1075
  const n = negative ? -mantissa : mantissa
  return Option.some(e >= 0 ? new RatioImpl(n << BigInt(e), 1n) : reduce(n, 1n << BigInt(-e)))
}

/**
 * The best rational approximation of `x` whose denominator does not exceed
 * `maxDenominator`, computed with continued fractions.
 *
 * @category constructors
 * @since 0.1.0
 */
export const approximate = (x: number, maxDenominator: bigint = 1_000_000n): Option.Option<Ratio> =>
  Option.map(fromNumber(x), (r) => limitDenominator(r, maxDenominator))

/**
 * The closest ratio to `self` with a denominator of at most
 * `maxDenominator` (Python's `Fraction.limit_denominator`).
 *
 * @category math
 * @since 0.1.0
 */
export const limitDenominator: Operator<Ratio, bigint, Ratio> = operator((self: Ratio, maxDenominator: bigint) => {
  if (maxDenominator < 1n) throw new RangeError("Ratio.limitDenominator: maxDenominator must be at least 1")
  if (self.denom <= maxDenominator) return self
  let [p0, q0, p1, q1] = [0n, 1n, 1n, 0n]
  let [n, d] = [self.numer, self.denom]
  for (;;) {
    const a = floorDiv(n, d)
    const q2 = q0 + a * q1
    if (q2 > maxDenominator) break
    ;[p0, q0, p1, q1] = [p1, q1, p0 + a * p1, q2]
    ;[n, d] = [d, n - a * d]
  }
  const k = (maxDenominator - q0) / q1
  const bound1 = reduce(p0 + k * p1, q0 + k * q1)
  const bound2 = reduce(p1, q1)
  const d1 = abs(sub(bound1, self))
  const d2 = abs(sub(bound2, self))
  return Order_(d2, d1) <= 0 ? bound2 : bound1
})

const floorDiv = (n: bigint, d: bigint): bigint => {
  const q = n / d
  return n % d !== 0n && n < 0n !== d < 0n ? q - 1n : q
}

const DECIMAL = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

/**
 * Parses `"n/d"`, an integer, or a decimal literal such as `"-1.25e3"`.
 *
 * @category constructors
 * @since 0.1.0
 */
export const parse = (input: string): Option.Option<Ratio> => {
  const s = input.trim()
  const slash = s.indexOf("/")
  if (slash >= 0) {
    const n = big.parse(s.slice(0, slash).trim(), 10)
    const d = big.parse(s.slice(slash + 1).trim(), 10)
    return n === undefined || d === undefined || d === 0n ? Option.none() : Option.some(reduce(n, d))
  }
  const m = DECIMAL.exec(s)
  if (m === null) return Option.none()
  const [, sign, intPart = "", fracPart = "", expPart] = m
  if (intPart.length === 0 && fracPart.length === 0) return Option.none()
  const digits = BigInt(`${intPart}${fracPart}` || "0") * (sign === "-" ? -1n : 1n)
  const exp = (expPart === undefined ? 0 : Number(expPart)) - fracPart.length
  if (!Number.isSafeInteger(exp)) return Option.none()
  return Option.some(exp >= 0 ? new RatioImpl(digits * 10n ** BigInt(exp), 1n) : reduce(digits, 10n ** BigInt(-exp)))
}

// -----------------------------------------------------------------------------
// arithmetic
// -----------------------------------------------------------------------------

/**
 * @category math
 * @since 0.1.0
 */
export const add: Operator<Ratio> = operator((a: Ratio, b: Ratio) =>
  reduce(a.numer * b.denom + b.numer * a.denom, a.denom * b.denom)
)

/**
 * @category math
 * @since 0.1.0
 */
export const sub: Operator<Ratio> = operator((a: Ratio, b: Ratio) =>
  reduce(a.numer * b.denom - b.numer * a.denom, a.denom * b.denom)
)

/**
 * @category math
 * @since 0.1.0
 */
export const mul: Operator<Ratio> = operator((a: Ratio, b: Ratio) => reduce(a.numer * b.numer, a.denom * b.denom))

/**
 * Division; fails with a `DivisionByZeroError` when dividing by zero.
 *
 * @category math
 * @since 0.1.0
 */
export const div: Operator<Ratio, Ratio, Result.Result<Ratio, DivisionByZeroError>> = operator((a: Ratio, b: Ratio) =>
  fromFraction(a.numer * b.denom, a.denom * b.numer)
)

/**
 * Division returning `None` when dividing by zero.
 *
 * @category math
 * @since 0.1.0
 */
export const checkedDiv: Operator<Ratio, Ratio, Option.Option<Ratio>> = operator((a: Ratio, b: Ratio) =>
  Result.getSuccess(div(a, b))
)

/**
 * The reciprocal `1 / self`; fails for zero.
 *
 * @category math
 * @since 0.1.0
 */
export const recip = (self: Ratio): Result.Result<Ratio, DivisionByZeroError> => fromFraction(self.denom, self.numer)

/**
 * @category math
 * @since 0.1.0
 */
export const negate = (self: Ratio): Ratio => (self.numer === 0n ? self : new RatioImpl(-self.numer, self.denom))

/**
 * @category math
 * @since 0.1.0
 */
export const abs = (self: Ratio): Ratio => (self.numer < 0n ? new RatioImpl(-self.numer, self.denom) : self)

/**
 * `-1`, `0` or `1`.
 *
 * @category math
 * @since 0.1.0
 */
export const sign = (self: Ratio): -1 | 0 | 1 => (self.numer > 0n ? 1 : self.numer < 0n ? -1 : 0)

/**
 * Raises to an integer power; negative exponents take the reciprocal. Fails
 * for `0` raised to a negative power.
 *
 * @category math
 * @since 0.1.0
 */
export const pow: Operator<Ratio, number, Result.Result<Ratio, DivisionByZeroError>> = operator(
  (self: Ratio, exp: number) => {
    if (!Number.isSafeInteger(exp)) throw new RangeError(`Ratio.pow: exponent must be a safe integer, got ${exp}`)
    const e = BigInt(Math.abs(exp))
    const n = self.numer ** e
    const d = self.denom ** e
    return exp >= 0 ? Result.succeed(new RatioImpl(n, d)) : fromFraction(d, n)
  }
)

/**
 * The simplest fraction between two ratios' numerators and denominators,
 * `(a.numer + b.numer) / (a.denom + b.denom)`.
 *
 * @category math
 * @since 0.1.0
 */
export const mediant: Operator<Ratio> = operator((a: Ratio, b: Ratio) => reduce(a.numer + b.numer, a.denom + b.denom))

// -----------------------------------------------------------------------------
// rounding & conversion
// -----------------------------------------------------------------------------

/**
 * Largest integer `<= self`.
 *
 * @category rounding
 * @since 0.1.0
 */
export const floor = (self: Ratio): bigint => floorDiv(self.numer, self.denom)

/**
 * Smallest integer `>= self`.
 *
 * @category rounding
 * @since 0.1.0
 */
export const ceil = (self: Ratio): bigint => -floorDiv(-self.numer, self.denom)

/**
 * Integer part, rounding toward zero.
 *
 * @category rounding
 * @since 0.1.0
 */
export const trunc = (self: Ratio): bigint => self.numer / self.denom

/**
 * Nearest integer, rounding half-way cases away from zero.
 *
 * @category rounding
 * @since 0.1.0
 */
export const round = (self: Ratio): bigint => {
  const n2 = 2n * big.abs(self.numer) + self.denom
  const r = n2 / (2n * self.denom)
  return self.numer < 0n ? -r : r
}

/**
 * Fractional part: `self - trunc(self)`, with the sign of `self`.
 *
 * @category rounding
 * @since 0.1.0
 */
export const fract = (self: Ratio): Ratio => new RatioImpl(self.numer % self.denom, self.denom)

/**
 * @category predicates
 * @since 0.1.0
 */
export const isInteger = (self: Ratio): boolean => self.denom === 1n

/**
 * @category predicates
 * @since 0.1.0
 */
export const isZero = (self: Ratio): boolean => self.numer === 0n

/**
 * The nearest `number` (correctly handling numerators and denominators
 * beyond 2^53).
 *
 * @category conversions
 * @since 0.1.0
 */
export const toNumber = (self: Ratio): number => {
  const { numer: n, denom: d } = self
  if (big.abs(n) <= 9007199254740991n && d <= 9007199254740991n) return Number(n) / Number(d)
  const a = big.abs(n)
  // E = floor(log2(a / d))
  let E = big.bitLength(a) - big.bitLength(d)
  if (E >= 0 ? a < d << BigInt(E) : a << BigInt(-E) < d) E--
  // exponent of the unit in the last place of the result (accounting for subnormals)
  const u = Math.max(E - 52, -1074)
  const num = u >= 0 ? a : a << BigInt(-u)
  const den = u >= 0 ? d << BigInt(u) : d
  let q = num / den
  const twice = 2n * (num - q * den)
  if (twice > den || (twice === den && (q & 1n) === 1n)) q++
  const x = Number(q) * 2 ** u
  return n < 0n ? -x : x
}

/**
 * `"numer/denom"`, or just `"numer"` for integers.
 *
 * @category conversions
 * @since 0.1.0
 */
export const toString = (self: Ratio): string => self.toString()

/**
 * Decimal expansion with a fixed number of fractional digits (rounded half
 * away from zero).
 *
 * @category conversions
 * @since 0.1.0
 */
export const toFixed: Operator<Ratio, number, string> = operator((self: Ratio, digits: number) => {
  if (!Number.isSafeInteger(digits) || digits < 0) throw new RangeError("Ratio.toFixed: digits must be >= 0")
  const scaled = round(new RatioImpl(self.numer * 10n ** BigInt(digits), self.denom))
  const negative = scaled < 0n
  const s = big
    .abs(scaled)
    .toString()
    .padStart(digits + 1, "0")
  const out = digits === 0 ? s : `${s.slice(0, -digits)}.${s.slice(-digits)}`
  return negative ? `-${out}` : out
})

// -----------------------------------------------------------------------------
// ordering
// -----------------------------------------------------------------------------

const Order_: Ord.Order<Ratio> = (a, b) => {
  const l = a.numer * b.denom
  const r = b.numer * a.denom
  return l < r ? -1 : l > r ? 1 : 0
}

/**
 * @category ordering
 * @since 0.1.0
 */
export const Order: Ord.Order<Ratio> = Order_

/**
 * @category ordering
 * @since 0.1.0
 */
export const Equivalence: Eqv.Equivalence<Ratio> = (a, b) => a.numer === b.numer && a.denom === b.denom

/**
 * @category ordering
 * @since 0.1.0
 */
export const min: Operator<Ratio> = operator((a: Ratio, b: Ratio) => (Order_(b, a) < 0 ? b : a))

/**
 * @category ordering
 * @since 0.1.0
 */
export const max: Operator<Ratio> = operator((a: Ratio, b: Ratio) => (Order_(a, b) < 0 ? b : a))

/**
 * @category ordering
 * @since 0.1.0
 */
export const clamp = (self: Ratio, minimum: Ratio, maximum: Ratio): Ratio =>
  Order_(self, minimum) < 0 ? minimum : Order_(maximum, self) < 0 ? maximum : self

// -----------------------------------------------------------------------------
// schemas
// -----------------------------------------------------------------------------

/**
 * Schema for `Ratio` values (no encoding).
 *
 * @category schemas
 * @since 0.1.0
 */
export const schema: Schema.Codec<Ratio> = Schema.declare(isRatio, { identifier: "Ratio" })

/**
 * Schema decoding a ratio from a string such as `"3/4"`, `"-2"` or `"0.125"`
 * and encoding it as `"numer/denom"`.
 *
 * @category schemas
 * @since 0.1.0
 */
export const schemaFromString: Schema.Codec<Ratio, string> = Schema.String.pipe(
  Schema.check(Schema.makeFilter((s: string) => Option.isSome(parse(s)) || "Expected a rational number literal")),
  Schema.decodeTo(schema, {
    decode: SchemaGetter.transform((s: string) => Option.getOrThrow(parse(s))),
    encode: SchemaGetter.transform(toString)
  })
)

// -----------------------------------------------------------------------------
// instances
// -----------------------------------------------------------------------------

/**
 * Type class instance for ratios. `div` and `recip` throw a
 * `DivisionByZeroError` when dividing by zero.
 *
 * @category instances
 * @since 0.1.0
 */
export const Field: OrderedNum<Ratio> & Signed<Ratio> & Fractional<Ratio> = {
  zero,
  one,
  isZero,
  isOne: (self) => self.numer === 1n && self.denom === 1n,
  Equivalence,
  Order,
  add,
  sub,
  mul,
  div: operator((a: Ratio, b: Ratio) => Result.getOrThrow(div(a, b))),
  recip: (self) => Result.getOrThrow(recip(self)),
  negate,
  abs,
  signum: (self) => new RatioImpl(BigInt(sign(self)), 1n)
}
