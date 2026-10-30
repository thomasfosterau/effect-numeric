/**
 * Fixed-width two's complement integers, modelled on Rust's primitive integer
 * types (`i8` … `u128`).
 *
 * A {@link FixedInt} is a module of operations for a branded integer type. It
 * offers every overflow strategy Rust does:
 *
 * | prefix          | on overflow                             | returns            |
 * | --------------- | --------------------------------------- | ------------------ |
 * | _(none)_        | fails with a typed error                | `Result<A, E>`     |
 * | `checked`       | returns `None`                          | `Option<A>`        |
 * | `wrapping`      | wraps around modulo 2^bits              | `A`                |
 * | `saturating`    | clamps to `MIN` / `MAX`                 | `A`                |
 * | `overflowing`   | wraps and reports whether it overflowed | `[A, boolean]`     |
 *
 * Types of up to 32 bits are represented as `number`, wider types as
 * `bigint`. Use {@link make} / {@link makeBig} to define integers of any other
 * width (for example a 24-bit or 4-bit integer).
 *
 * @since 0.1.0
 */
import * as Arr from "effect/Array"
import * as Equivalence from "effect/Equivalence"
import * as Iterable from "effect/Iterable"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import {
  type ArithmeticError,
  DivisionByZeroError,
  DomainError,
  OutOfRangeError,
  OverflowError,
  ParseError
} from "./ArithmeticError.ts"
import type { CheckedOps } from "./Checked.ts"
import * as big from "./internal/bigint.ts"
import { brandAs, unsafeBrand } from "./internal/brand.ts"
import { iterateWhile } from "./internal/iterate.ts"
import { type Bounded, type One, type Operator, operator, type Zero } from "./Num.ts"
import type { OverflowingOps } from "./Overflowing.ts"
import type { SaturatingOps } from "./Saturating.ts"
import type { WrappingOps } from "./Wrapping.ts"

/**
 * Description of a fixed-width integer type.
 *
 * @category models
 * @since 0.1.0
 */
export interface Spec {
  /** Name of the type, used for the brand, error messages and schemas. */
  readonly name: string
  /** Width in bits. */
  readonly bits: number
  /** Whether the type is signed (two's complement) or unsigned. */
  readonly signed: boolean
}

/**
 * The operations available on a fixed-width integer type `A`, represented at
 * runtime by `R` (`number` or `bigint`).
 *
 * @category models
 * @since 0.1.0
 */
export interface FixedInt<A extends R, R extends number | bigint = number | bigint>
  extends Spec, Zero<A>, One<A>, Bounded<A>, CheckedOps<A>, WrappingOps<A>, SaturatingOps<A>, OverflowingOps<A> {
  /** The runtime representation, `"number"` or `"bigint"`. */
  readonly repr: R extends bigint ? "bigint" : "number"
  /** The smallest value of the type. */
  readonly MIN: A
  /** The largest value of the type. */
  readonly MAX: A
  readonly Order: Order.Order<A>
  readonly Equivalence: Equivalence.Equivalence<A>

  // --- schemas ------------------------------------------------------------

  /** Schema validating a `number`/`bigint` as a member of this type. */
  readonly schema: Schema.Codec<A, R>
  /** Schema decoding this type from its decimal string representation. */
  readonly schemaFromString: Schema.Codec<A, string>

  // --- construction & conversion -----------------------------------------

  /** Type guard: is `u` a valid value of this type? */
  readonly is: (u: unknown) => u is A
  /** Converts a value if it is an integer within range (Rust's `TryFrom`). */
  readonly from: (value: number | bigint) => Option.Option<A>
  /** Like {@link from} but describes the failure. */
  readonly fromResult: (value: number | bigint) => Result.Result<A, OutOfRangeError>
  /** Like {@link from} but throws an {@link OutOfRangeError} on failure. */
  readonly make: (value: number | bigint) => A
  /**
   * Truncates toward zero, then wraps modulo 2^bits (Rust's `as` between
   * integers). Non-finite numbers become zero.
   */
  readonly wrappingFrom: (value: number | bigint) => A
  /**
   * Truncates toward zero, then clamps to `[MIN, MAX]` (Rust's `as` from a
   * float). `NaN` becomes zero.
   */
  readonly saturatingFrom: (value: number | bigint) => A
  /** Converts to a `number`. Values beyond 2^53 lose precision. */
  readonly toNumber: (self: A) => number
  readonly toBigInt: (self: A) => bigint
  readonly toString: (self: A, radix?: number) => string
  /** Parses an integer literal with optional sign (radix 2 to 36, default 10). */
  readonly parse: (input: string, radix?: number) => Result.Result<A, ParseError | OutOfRangeError>

  // --- strict arithmetic (Result) -----------------------------------------

  readonly add: Operator<A, A, Result.Result<A, OverflowError>>
  readonly sub: Operator<A, A, Result.Result<A, OverflowError>>
  readonly mul: Operator<A, A, Result.Result<A, OverflowError>>
  /** Division rounding toward zero. */
  readonly div: Operator<A, A, Result.Result<A, OverflowError | DivisionByZeroError>>
  /** Remainder with the sign of the dividend. */
  readonly rem: Operator<A, A, Result.Result<A, OverflowError | DivisionByZeroError>>
  /** Euclidean division: the quotient such that the remainder is non-negative. */
  readonly divEuclid: Operator<A, A, Result.Result<A, OverflowError | DivisionByZeroError>>
  /** Euclidean remainder: always non-negative. */
  readonly remEuclid: Operator<A, A, Result.Result<A, OverflowError | DivisionByZeroError>>
  readonly neg: (self: A) => Result.Result<A, OverflowError>
  readonly abs: (self: A) => Result.Result<A, OverflowError>
  readonly pow: Operator<A, number, Result.Result<A, ArithmeticError>>
  readonly shl: Operator<A, number, Result.Result<A, ArithmeticError>>
  readonly shr: Operator<A, number, Result.Result<A, ArithmeticError>>
  /** Floor of the square root; fails for negative values. */
  readonly isqrt: (self: A) => Result.Result<A, DomainError>
  /** Floor of the base 2 logarithm; fails for values `<= 0`. */
  readonly ilog2: (self: A) => Result.Result<number, DomainError>
  /** Floor of the base 10 logarithm; fails for values `<= 0`. */
  readonly ilog10: (self: A) => Result.Result<number, DomainError>
  /** Floor of the logarithm in the given base; fails for values `<= 0` or a base `< 2`. */
  readonly ilog: Operator<A, A, Result.Result<number, DomainError>>

  // --- additional checked operations -------------------------------------

  readonly checkedAbs: (self: A) => Option.Option<A>
  readonly checkedDivEuclid: Operator<A, A, Option.Option<A>>
  readonly checkedRemEuclid: Operator<A, A, Option.Option<A>>
  readonly checkedIsqrt: (self: A) => Option.Option<A>
  readonly checkedIlog2: (self: A) => Option.Option<number>
  readonly checkedIlog10: (self: A) => Option.Option<number>
  readonly checkedIlog: Operator<A, A, Option.Option<number>>
  /** The smallest power of two `>= self`, if representable. */
  readonly checkedNextPowerOfTwo: (self: A) => Option.Option<A>

  // --- additional wrapping / saturating / overflowing operations ----------

  readonly wrappingAbs: (self: A) => A
  readonly wrappingDivEuclid: Operator<A>
  readonly wrappingRemEuclid: Operator<A>
  readonly saturatingNeg: (self: A) => A
  readonly saturatingAbs: (self: A) => A
  readonly overflowingAbs: (self: A) => readonly [A, boolean]

  // --- comparison & misc ---------------------------------------------------

  readonly min: Operator<A>
  readonly max: Operator<A>
  readonly clamp: (self: A, minimum: A, maximum: A) => A
  readonly signum: (self: A) => A
  readonly isPositive: (self: A) => boolean
  readonly isNegative: (self: A) => boolean
  readonly isPowerOfTwo: (self: A) => boolean
  /** `(self + that) / 2` rounded toward zero, computed without overflow. */
  readonly midpoint: Operator<A>
  /** `|self - that|` computed without overflow, as a `bigint`. */
  readonly absDiff: Operator<A, A, bigint>

  // --- bit manipulation ------------------------------------------------------

  readonly bitAnd: Operator<A>
  readonly bitOr: Operator<A>
  readonly bitXor: Operator<A>
  readonly bitNot: (self: A) => A
  readonly countOnes: (self: A) => number
  readonly countZeros: (self: A) => number
  readonly leadingZeros: (self: A) => number
  readonly trailingZeros: (self: A) => number
  readonly leadingOnes: (self: A) => number
  readonly trailingOnes: (self: A) => number
  readonly rotateLeft: Operator<A, number, A>
  readonly rotateRight: Operator<A, number, A>
  readonly reverseBits: (self: A) => A
  /** Reverses the byte order. Requires a width that is a multiple of 8. */
  readonly swapBytes: (self: A) => A
  /** Big-endian bytes. Requires a width that is a multiple of 8. */
  readonly toBeBytes: (self: A) => Uint8Array
  /** Little-endian bytes. Requires a width that is a multiple of 8. */
  readonly toLeBytes: (self: A) => Uint8Array
  readonly fromBeBytes: (bytes: Uint8Array) => Option.Option<A>
  readonly fromLeBytes: (bytes: Uint8Array) => Option.Option<A>

  // --- iteration -----------------------------------------------------------

  /** Values in `[start, end)`. */
  readonly range: (start: A, end: A) => IterableIterator<A>
  /** Values in `[start, end]`. */
  readonly rangeInclusive: (start: A, end: A) => IterableIterator<A>
}

// -----------------------------------------------------------------------------
// primitive adapters
// -----------------------------------------------------------------------------

interface Prim<R> {
  readonly zero: R
  readonly one: R
  readonly two: R
  readonly min: R
  readonly max: R
  readonly isRepr: (u: unknown) => u is R
  readonly fromBig: (b: bigint) => R
  readonly toBig: (r: R) => bigint
  readonly toNum: (r: R) => number
  /** Exact. */
  readonly add: (a: R, b: R) => R
  /** Exact. */
  readonly sub: (a: R, b: R) => R
  /** Exact when the result is in range; otherwise monotone (enough for range checks). */
  readonly mul: (a: R, b: R) => R
  /** Truncating division, `b !== 0`. Exact. */
  readonly quot: (a: R, b: R) => R
  /** Truncating remainder, `b !== 0`. Exact. */
  readonly rem: (a: R, b: R) => R
  readonly lt: (a: R, b: R) => boolean
  /** Reduces an exact integer modulo 2^bits into range. */
  readonly wrap: (r: R) => R
  readonly wrappingMul: (a: R, b: R) => R
  readonly and: (a: R, b: R) => R
  readonly or: (a: R, b: R) => R
  readonly xor: (a: R, b: R) => R
  readonly not: (a: R) => R
  /** `0 <= n < bits` */
  readonly shl: (a: R, n: number) => R
  /** `0 <= n < bits` */
  readonly shr: (a: R, n: number) => R
}

const numberPrim = (bits: number, signed: boolean): Prim<number> => {
  const shift = 32 - bits
  const mask = bits === 32 ? -1 : (1 << bits) - 1
  const wrap: (r: number) => number = signed
    ? bits === 32
      ? (r) => r | 0
      : (r) => (r << shift) >> shift
    : bits === 32
      ? (r) => r >>> 0
      : (r) => r & mask
  return {
    zero: 0,
    one: 1,
    two: 2,
    min: signed ? -(2 ** (bits - 1)) : 0,
    max: signed ? 2 ** (bits - 1) - 1 : 2 ** bits - 1,
    isRepr: Predicate.isNumber,
    fromBig: Number,
    toBig: BigInt,
    toNum: (r) => r,
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    mul: (a, b) => a * b + 0,
    quot: (a, b) => Math.trunc(a / b) + 0,
    rem: (a, b) => (a % b) + 0,
    lt: (a, b) => a < b,
    wrap,
    wrappingMul: (a, b) => wrap(Math.imul(a, b)),
    and: (a, b) => wrap(a & b),
    or: (a, b) => wrap(a | b),
    xor: (a, b) => wrap(a ^ b),
    not: (a) => wrap(~a),
    shl: (a, n) => wrap(a << n),
    shr: signed ? (a, n) => a >> n : (a, n) => a >>> n
  }
}

const bigintPrim = (bits: number, signed: boolean): Prim<bigint> => {
  const wrap = signed ? (r: bigint) => BigInt.asIntN(bits, r) : (r: bigint) => BigInt.asUintN(bits, r)
  return {
    zero: 0n,
    one: 1n,
    two: 2n,
    min: signed ? -(1n << BigInt(bits - 1)) : 0n,
    max: signed ? (1n << BigInt(bits - 1)) - 1n : (1n << BigInt(bits)) - 1n,
    isRepr: Predicate.isBigInt,
    fromBig: (b) => b,
    toBig: (r) => r,
    toNum: Number,
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
    mul: (a, b) => a * b,
    quot: (a, b) => a / b,
    rem: (a, b) => a % b,
    lt: (a, b) => a < b,
    wrap,
    wrappingMul: (a, b) => wrap(a * b),
    and: (a, b) => wrap(a & b),
    or: (a, b) => wrap(a | b),
    xor: (a, b) => wrap(a ^ b),
    not: (a) => wrap(~a),
    shl: (a, n) => wrap(a << BigInt(n)),
    shr: (a, n) => a >> BigInt(n)
  }
}

// -----------------------------------------------------------------------------
// constructors
// -----------------------------------------------------------------------------

/**
 * Defines a fixed-width integer type represented as a `number`. The width
 * must be between 1 and 32 bits.
 *
 * @example
 * ```ts
 * import type { Brand } from "effect"
 * import { FixedInt } from "effect-numeric"
 *
 * type U4 = number & Brand.Brand<"U4">
 * const U4 = FixedInt.make<U4>({ name: "U4", bits: 4, signed: false })
 *
 * U4.wrappingAdd(U4.make(15), U4.make(1)) // 0
 * ```
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = <A extends number>(spec: Spec): FixedInt<A, number> => {
  if (!Number.isInteger(spec.bits) || spec.bits < 1 || spec.bits > 32) {
    throw new RangeError(`FixedInt.make: bits must be an integer in [1, 32], got ${spec.bits}`)
  }
  const prim = numberPrim(spec.bits, spec.signed)
  const schema = brandAs<A, number>(
    Schema.Number.pipe(Schema.check(Schema.isInt(), Schema.isBetween({ minimum: prim.min, maximum: prim.max }))),
    spec.name
  )
  return build<A, number>(
    spec,
    prim,
    "number",
    schema,
    Schema.NumberFromString.pipe(Schema.decodeTo(schema)),
    Order.Number,
    Equivalence.Number
  )
}

/**
 * Defines a fixed-width integer type represented as a `bigint`. Any positive
 * width is allowed.
 *
 * @example
 * ```ts
 * import type { Brand } from "effect"
 * import { FixedInt } from "effect-numeric"
 *
 * type I256 = bigint & Brand.Brand<"I256">
 * const I256 = FixedInt.makeBig<I256>({ name: "I256", bits: 256, signed: true })
 * ```
 *
 * @category constructors
 * @since 0.1.0
 */
export const makeBig = <A extends bigint>(spec: Spec): FixedInt<A, bigint> => {
  if (!Number.isInteger(spec.bits) || spec.bits < 1) {
    throw new RangeError(`FixedInt.makeBig: bits must be a positive integer, got ${spec.bits}`)
  }
  const prim = bigintPrim(spec.bits, spec.signed)
  const schema = brandAs<A, bigint>(
    Schema.BigInt.pipe(Schema.check(Schema.isBetweenBigInt({ minimum: prim.min, maximum: prim.max }))),
    spec.name
  )
  return build<A, bigint>(
    spec,
    prim,
    "bigint",
    schema,
    Schema.BigIntFromString.pipe(Schema.decodeTo(schema)),
    Order.BigInt,
    Equivalence.BigInt
  )
}

/**
 * Extracts the value type of a {@link FixedInt} module.
 *
 * @category type-level
 * @since 0.1.0
 */
export type ValueOf<T> = T extends FixedInt<infer A, infer _R> ? A : never

/**
 * Converts a value from one fixed-width integer type to another, returning
 * `None` if it does not fit (Rust's `TryFrom`).
 *
 * @category conversions
 * @since 0.1.0
 */
export const convert =
  <B extends number | bigint>(to: FixedInt<B, any>) =>
  (value: number | bigint): Option.Option<B> =>
    to.from(value)

// -----------------------------------------------------------------------------
// implementation
// -----------------------------------------------------------------------------

/** Truncates toward zero; `None` for `NaN` and the infinities. */
const truncate = (value: number | bigint): Option.Option<bigint> =>
  Predicate.isBigInt(value)
    ? Option.some(value)
    : Number.isFinite(value)
      ? Option.some(BigInt(Math.trunc(value)))
      : Option.none()

const build = <A extends R, R extends number | bigint>(
  spec: Spec,
  P: Prim<R>,
  repr: FixedInt<A, R>["repr"],
  schema: Schema.Codec<A, R>,
  schemaFromString: Schema.Codec<A, string>,
  ord: Order.Order<R>,
  eqv: Equivalence.Equivalence<R>
): FixedInt<A, R> => {
  const { name: type, bits, signed } = spec
  /** Whether `r` is a value of the type, i.e. an integer in `[MIN, MAX]` (callers pass integers). */
  const inRange = (r: R): r is A => !(P.lt(r, P.min) || P.lt(P.max, r))
  /**
   * Brands a representation value that is in `[MIN, MAX]` by construction:
   * the type's own bounds and constants, the output of `P.wrap` and of the
   * `Prim` operations that wrap internally (`wrappingMul`, `and`, `or`,
   * `xor`, `not`, `shl`), and exact results that cannot leave the range of
   * their in-range operands (`rem`, Euclidean remainder, `shr`, `midpoint`,
   * `isqrt`, a range-checked `fromBig`).
   */
  const inRangeByConstruction = (r: R): A =>
    // SAFETY: every call site passes a value in `[MIN, MAX]`; see the doc comment.
    unsafeBrand<A, R>(r)
  const MIN = inRangeByConstruction(P.min)
  const MAX = inRangeByConstruction(P.max)
  const ZERO = inRangeByConstruction(P.zero)
  const ONE = inRangeByConstruction(P.one)
  const NEG_ONE: R = signed ? P.sub(P.zero, P.one) : P.zero
  const bigMin = P.toBig(P.min)
  const bigMax = P.toBig(P.max)
  const limit = 1n << BigInt(bits)
  const byteAligned = bits % 8 === 0

  const someIfInRange = (r: R): Option.Option<A> => (inRange(r) ? Option.some(r) : Option.none())
  const sat = (r: R): A => (inRange(r) ? r : P.lt(r, P.min) ? MIN : MAX)
  const wrap = (r: R): A => inRangeByConstruction(P.wrap(r))
  const isZero = (r: R) => eqv(r, P.zero)
  const isNeg = (r: R) => P.lt(r, P.zero)
  /** The only overflowing case of division and remainder. */
  const isMinByNegOne = (a: R, b: R) => signed && eqv(a, P.min) && eqv(b, NEG_ONE)

  const overflow = (operation: string) => new OverflowError({ operation, type })
  const divByZero = (operation: string) => new DivisionByZeroError({ operation, type })
  const domain = (operation: string, reason: string) => new DomainError({ operation, type, reason })
  const strict =
    (operation: string) =>
    (r: R): Result.Result<A, OverflowError> =>
      inRange(r) ? Result.succeed(r) : Result.fail(overflow(operation))
  const assertNonZero = (b: R, operation: string) => {
    if (isZero(b)) throw divByZero(operation)
  }
  const assertShift = (n: number, operation: string) => {
    if (!big.isNonNegativeInteger(n)) throw domain(operation, `shift amount must be a non-negative integer, got ${n}`)
  }
  const assertExp = (exp: number) => {
    if (!big.isNonNegativeInteger(exp)) throw domain("pow", `exponent must be a non-negative integer, got ${exp}`)
  }
  const assertBytes = (operation: string) => {
    if (!byteAligned) throw domain(operation, `requires a width that is a multiple of 8 bits, got ${bits}`)
  }

  // --- conversion -----------------------------------------------------------

  const fromBigChecked = (b: bigint): Option.Option<A> =>
    b < bigMin || b > bigMax ? Option.none() : Option.some(inRangeByConstruction(P.fromBig(b)))

  const outOfRange = (value: number | bigint) => new OutOfRangeError({ type, value, min: P.min, max: P.max })
  const from = (value: number | bigint): Option.Option<A> => {
    // Fast path for `number`-represented types: `value + 0` turns `-0` into `0`.
    if (repr === "number" && P.isRepr(value)) {
      return Number.isInteger(value) ? someIfInRange(P.add(value, P.zero)) : Option.none()
    }
    return Option.flatMap(big.toBigIntExact(value), fromBigChecked)
  }
  const fromResult = (value: number | bigint): Result.Result<A, OutOfRangeError> =>
    Option.match(from(value), {
      onNone: () => Result.fail(outOfRange(value)),
      onSome: Result.succeed
    })
  const wrappingFrom = (value: number | bigint): A => {
    if (repr === "number" && P.isRepr(value) && Number.isSafeInteger(value)) return wrap(value)
    return Option.match(truncate(value), { onNone: () => ZERO, onSome: (b) => fromU(BigInt.asUintN(bits, b)) })
  }
  const saturatingFrom = (value: number | bigint): A => {
    if (value === Number.POSITIVE_INFINITY) return MAX
    if (value === Number.NEGATIVE_INFINITY) return MIN
    // Only `NaN` is left without a truncation.
    return Option.match(truncate(value), {
      onNone: () => ZERO,
      onSome: (b) => (b < bigMin ? MIN : b > bigMax ? MAX : inRangeByConstruction(P.fromBig(b)))
    })
  }

  // --- division family -------------------------------------------------------

  const euclidQuot = (a: R, b: R): R => {
    const q = P.quot(a, b)
    return isNeg(P.rem(a, b)) ? (isNeg(b) ? P.add(q, P.one) : P.sub(q, P.one)) : q
  }
  const euclidRem = (a: R, b: R): R => {
    const r = P.rem(a, b)
    return isNeg(r) ? (isNeg(b) ? P.sub(r, b) : P.add(r, b)) : r
  }
  /**
   * The strict form of a remainder `f`: fails on a zero divisor, and on
   * `MIN % -1` (whose quotient overflows, so Rust reports the remainder as
   * overflowing too).
   */
  const strictRemainder =
    (f: (a: R, b: R) => R) =>
    (a: A, b: A): Result.Result<A, DivisionByZeroError | OverflowError> =>
      isZero(b)
        ? Result.fail(divByZero("calculate the remainder"))
        : isMinByNegOne(a, b)
          ? Result.fail(overflow("calculate the remainder"))
          : Result.succeed(inRangeByConstruction(f(a, b)))
  const absR = (a: R): R => (isNeg(a) ? P.sub(P.zero, a) : a)

  // --- pow ---------------------------------------------------------------------

  /** `a ** exp` when it fits the type, `None` on overflow. */
  const powChecked = (a: A, exp: number): Option.Option<A> =>
    Option.flatMap(big.powBounded(P.toBig(a), exp, limit), fromBigChecked)
  const powWrapping = (a: A, exp: number): A => fromU(big.powMod2(P.toBig(a), exp, bits))

  // --- bits ---------------------------------------------------------------------

  const mask = limit - 1n
  const toU = (a: A): bigint => BigInt.asUintN(bits, P.toBig(a))
  /** The value whose unsigned `bits`-bit pattern is `u` (`0 <= u < 2^bits`). */
  const fromU = (u: bigint): A => inRangeByConstruction(P.fromBig(signed ? BigInt.asIntN(bits, u) : u))
  const countOnes = (a: A): number => Arr.reduce(toU(a).toString(2), 0, (n, c) => (c === "1" ? n + 1 : n))
  const leadingZeros = (a: A): number => bits - big.bitLength(toU(a))
  const trailingZeros = (a: A): number => {
    const u = toU(a)
    return u === 0n ? bits : big.trailingZeros(u)
  }
  const rotateLeft = (a: A, n: number): A => {
    assertShift(n, "rotate")
    const k = n % bits
    if (k === 0) return a
    const u = toU(a)
    return fromU(((u << BigInt(k)) | (u >> BigInt(bits - k))) & mask)
  }
  const toLeBytes = (a: A): Uint8Array => {
    assertBytes("toLeBytes")
    const u = toU(a)
    return Uint8Array.from({ length: bits / 8 }, (_, i) => Number((u >> BigInt(8 * i)) & 0xffn))
  }
  /** The value whose little-endian bytes are `bytes` (exactly `bits / 8` of them). */
  const fromLeBytesExact = (bytes: Uint8Array): A =>
    fromU(Arr.reduceRight(bytes, 0n, (u, byte) => (u << 8n) | BigInt(byte)))
  const fromLeBytes = (bytes: Uint8Array): Option.Option<A> => {
    assertBytes("fromLeBytes")
    return bytes.length === bits / 8 ? Option.some(fromLeBytesExact(bytes)) : Option.none()
  }

  // --- ilog / isqrt --------------------------------------------------------------

  const ilogImpl = (a: A, base: bigint, operation: string): Result.Result<number, DomainError> => {
    const b = P.toBig(a)
    if (b <= 0n) return Result.fail(domain(operation, `argument must be positive, got ${b}`))
    if (base < 2n) return Result.fail(domain(operation, `base must be at least 2, got ${base}`))
    return Result.succeed(big.ilog(b, base))
  }
  const isqrt = (a: A): Result.Result<A, DomainError> => {
    if (isNeg(a)) return Result.fail(domain("isqrt", `argument must be non-negative, got ${a}`))
    return Result.succeed(inRangeByConstruction(P.fromBig(big.isqrt(P.toBig(a)))))
  }

  // --- assembled module -----------------------------------------------------------

  const self: FixedInt<A, R> = {
    name: type,
    bits,
    signed,
    repr,
    MIN,
    MAX,
    minValue: MIN,
    maxValue: MAX,
    zero: ZERO,
    one: ONE,
    isZero,
    isOne: (a) => eqv(a, P.one),
    Order: ord,
    Equivalence: eqv,
    schema,
    schemaFromString,

    is: (u): u is A => P.isRepr(u) && Option.isSome(from(u)),
    from,
    fromResult,
    make: (value) =>
      Option.getOrElse(from(value), () => {
        throw outOfRange(value)
      }),
    wrappingFrom,
    saturatingFrom,
    toNumber: P.toNum,
    toBigInt: P.toBig,
    toString: (a, radix = 10) => a.toString(radix),
    parse: (input, radix = 10) =>
      Option.match(big.parse(input, radix), {
        onNone: () => Result.fail(new ParseError({ type, input })),
        onSome: (b) =>
          Option.match(fromBigChecked(b), {
            onNone: () => Result.fail(outOfRange(b)),
            onSome: Result.succeed
          })
      }),

    // strict
    add: operator((a: A, b: A) => strict("add")(P.add(a, b))),
    sub: operator((a: A, b: A) => strict("subtract")(P.sub(a, b))),
    mul: operator((a: A, b: A) => strict("multiply")(P.mul(a, b))),
    div: operator((a: A, b: A) => (isZero(b) ? Result.fail(divByZero("divide")) : strict("divide")(P.quot(a, b)))),
    rem: operator(strictRemainder(P.rem)),
    divEuclid: operator((a: A, b: A) =>
      isZero(b) ? Result.fail(divByZero("divide")) : strict("divide")(euclidQuot(a, b))
    ),
    remEuclid: operator(strictRemainder(euclidRem)),
    neg: (a) => strict("negate")(P.sub(P.zero, a)),
    abs: (a) => strict("take the absolute value")(absR(a)),
    pow: operator((a: A, exp: number): Result.Result<A, ArithmeticError> => {
      if (!big.isNonNegativeInteger(exp)) {
        return Result.fail(domain("pow", `exponent must be a non-negative integer, got ${exp}`))
      }
      return Option.match(powChecked(a, exp), {
        onNone: () => Result.fail(overflow("pow")),
        onSome: Result.succeed
      })
    }),
    shl: operator((a: A, n: number): Result.Result<A, ArithmeticError> =>
      !big.isNonNegativeInteger(n)
        ? Result.fail(domain("shift left", `shift amount must be a non-negative integer, got ${n}`))
        : n >= bits
          ? Result.fail(overflow("shift left"))
          : Result.succeed(inRangeByConstruction(P.shl(a, n)))
    ),
    shr: operator((a: A, n: number): Result.Result<A, ArithmeticError> =>
      !big.isNonNegativeInteger(n)
        ? Result.fail(domain("shift right", `shift amount must be a non-negative integer, got ${n}`))
        : n >= bits
          ? Result.fail(overflow("shift right"))
          : Result.succeed(inRangeByConstruction(P.shr(a, n)))
    ),
    isqrt,
    ilog2: (a) => ilogImpl(a, 2n, "ilog2"),
    ilog10: (a) => ilogImpl(a, 10n, "ilog10"),
    ilog: operator((a: A, base: A) => ilogImpl(a, P.toBig(base), "ilog")),

    // checked
    checkedAdd: operator((a: A, b: A) => someIfInRange(P.add(a, b))),
    checkedSub: operator((a: A, b: A) => someIfInRange(P.sub(a, b))),
    checkedMul: operator((a: A, b: A) => someIfInRange(P.mul(a, b))),
    checkedDiv: operator((a: A, b: A) => (isZero(b) ? Option.none() : someIfInRange(P.quot(a, b)))),
    checkedRem: operator((a: A, b: A) =>
      isZero(b) || isMinByNegOne(a, b) ? Option.none() : Option.some(inRangeByConstruction(P.rem(a, b)))
    ),
    checkedDivEuclid: operator((a: A, b: A) => (isZero(b) ? Option.none() : someIfInRange(euclidQuot(a, b)))),
    checkedRemEuclid: operator((a: A, b: A) =>
      isZero(b) || isMinByNegOne(a, b) ? Option.none() : Option.some(inRangeByConstruction(euclidRem(a, b)))
    ),
    checkedNeg: (a) => someIfInRange(P.sub(P.zero, a)),
    checkedAbs: (a) => someIfInRange(absR(a)),
    checkedPow: operator((a: A, exp: number) => {
      assertExp(exp)
      return powChecked(a, exp)
    }),
    checkedShl: operator((a: A, n: number) => {
      assertShift(n, "shift left")
      return n >= bits ? Option.none() : Option.some(inRangeByConstruction(P.shl(a, n)))
    }),
    checkedShr: operator((a: A, n: number) => {
      assertShift(n, "shift right")
      return n >= bits ? Option.none() : Option.some(inRangeByConstruction(P.shr(a, n)))
    }),
    checkedIsqrt: (a) => Result.getSuccess(isqrt(a)),
    checkedIlog2: (a) => Result.getSuccess(ilogImpl(a, 2n, "ilog2")),
    checkedIlog10: (a) => Result.getSuccess(ilogImpl(a, 10n, "ilog10")),
    checkedIlog: operator((a: A, base: A) => Result.getSuccess(ilogImpl(a, P.toBig(base), "ilog"))),
    checkedNextPowerOfTwo: (a) => {
      const b = P.toBig(a)
      const p = b <= 1n ? 1n : 1n << BigInt(big.bitLength(b - 1n))
      return fromBigChecked(p)
    },

    // wrapping
    wrappingAdd: operator((a: A, b: A) => wrap(P.add(a, b))),
    wrappingSub: operator((a: A, b: A) => wrap(P.sub(a, b))),
    wrappingMul: operator((a: A, b: A) => inRangeByConstruction(P.wrappingMul(a, b))),
    wrappingDiv: operator((a: A, b: A) => {
      assertNonZero(b, "divide")
      return wrap(P.quot(a, b))
    }),
    wrappingRem: operator((a: A, b: A) => {
      assertNonZero(b, "calculate the remainder")
      return inRangeByConstruction(P.rem(a, b))
    }),
    wrappingDivEuclid: operator((a: A, b: A) => {
      assertNonZero(b, "divide")
      return wrap(euclidQuot(a, b))
    }),
    wrappingRemEuclid: operator((a: A, b: A) => {
      assertNonZero(b, "calculate the remainder")
      return inRangeByConstruction(euclidRem(a, b))
    }),
    wrappingNeg: (a) => wrap(P.sub(P.zero, a)),
    wrappingAbs: (a) => wrap(absR(a)),
    wrappingPow: operator((a: A, exp: number) => {
      assertExp(exp)
      return powWrapping(a, exp)
    }),
    wrappingShl: operator((a: A, n: number) => {
      assertShift(n, "shift left")
      return inRangeByConstruction(P.shl(a, n % bits))
    }),
    wrappingShr: operator((a: A, n: number) => {
      assertShift(n, "shift right")
      return inRangeByConstruction(P.shr(a, n % bits))
    }),

    // saturating
    saturatingAdd: operator((a: A, b: A) => sat(P.add(a, b))),
    saturatingSub: operator((a: A, b: A) => sat(P.sub(a, b))),
    saturatingMul: operator((a: A, b: A) => sat(P.mul(a, b))),
    saturatingDiv: operator((a: A, b: A) => {
      assertNonZero(b, "divide")
      return sat(P.quot(a, b))
    }),
    saturatingNeg: (a) => sat(P.sub(P.zero, a)),
    saturatingAbs: (a) => sat(absR(a)),
    saturatingPow: operator((a: A, exp: number) => {
      assertExp(exp)
      return Option.getOrElse(powChecked(a, exp), () => (isNeg(a) && exp % 2 === 1 ? MIN : MAX))
    }),

    // overflowing
    overflowingAdd: operator((a: A, b: A) => {
      const r = P.add(a, b)
      return [wrap(r), !inRange(r)] as const
    }),
    overflowingSub: operator((a: A, b: A) => {
      const r = P.sub(a, b)
      return [wrap(r), !inRange(r)] as const
    }),
    overflowingMul: operator(
      (a: A, b: A) => [inRangeByConstruction(P.wrappingMul(a, b)), !inRange(P.mul(a, b))] as const
    ),
    overflowingDiv: operator((a: A, b: A) => {
      assertNonZero(b, "divide")
      const q = P.quot(a, b)
      return [wrap(q), !inRange(q)] as const
    }),
    overflowingRem: operator((a: A, b: A) => {
      assertNonZero(b, "calculate the remainder")
      return [inRangeByConstruction(P.rem(a, b)), isMinByNegOne(a, b)] as const
    }),
    overflowingNeg: (a) => {
      const r = P.sub(P.zero, a)
      return [wrap(r), !inRange(r)] as const
    },
    overflowingAbs: (a) => {
      const r = absR(a)
      return [wrap(r), !inRange(r)] as const
    },
    overflowingPow: operator((a: A, exp: number) => {
      assertExp(exp)
      return [powWrapping(a, exp), Option.isNone(powChecked(a, exp))] as const
    }),
    overflowingShl: operator((a: A, n: number) => {
      assertShift(n, "shift left")
      return [inRangeByConstruction(P.shl(a, n % bits)), n >= bits] as const
    }),
    overflowingShr: operator((a: A, n: number) => {
      assertShift(n, "shift right")
      return [inRangeByConstruction(P.shr(a, n % bits)), n >= bits] as const
    }),

    // comparison & misc
    min: operator((a: A, b: A) => (P.lt(b, a) ? b : a)),
    max: operator((a: A, b: A) => (P.lt(a, b) ? b : a)),
    clamp: (a, minimum, maximum) => (P.lt(a, minimum) ? minimum : P.lt(maximum, a) ? maximum : a),
    signum: (a) => (isNeg(a) ? inRangeByConstruction(NEG_ONE) : isZero(a) ? ZERO : ONE),
    isPositive: (a) => P.lt(P.zero, a),
    isNegative: isNeg,
    isPowerOfTwo: (a) => !isNeg(a) && !isZero(a) && isZero(P.and(a, P.sub(a, P.one))),
    midpoint: operator((a: A, b: A) => inRangeByConstruction(P.quot(P.add(a, b), P.two))),
    absDiff: operator((a: A, b: A) => big.abs(P.toBig(a) - P.toBig(b))),

    // bits
    bitAnd: operator((a: A, b: A) => inRangeByConstruction(P.and(a, b))),
    bitOr: operator((a: A, b: A) => inRangeByConstruction(P.or(a, b))),
    bitXor: operator((a: A, b: A) => inRangeByConstruction(P.xor(a, b))),
    bitNot: (a) => inRangeByConstruction(P.not(a)),
    countOnes,
    countZeros: (a) => bits - countOnes(a),
    leadingZeros,
    trailingZeros,
    leadingOnes: (a) => leadingZeros(inRangeByConstruction(P.not(a))),
    trailingOnes: (a) => trailingZeros(inRangeByConstruction(P.not(a))),
    rotateLeft: operator(rotateLeft),
    rotateRight: operator((a: A, n: number) => {
      assertShift(n, "rotate")
      return rotateLeft(a, bits - (n % bits))
    }),
    reverseBits: (a) => fromU(BigInt(`0b${toU(a).toString(2).padStart(bits, "0").split("").reverse().join("")}`)),
    swapBytes: (a) => {
      assertBytes("swapBytes")
      return fromLeBytesExact(toLeBytes(a).reverse())
    },
    toBeBytes: (a) => toLeBytes(a).reverse(),
    toLeBytes,
    fromBeBytes: (bytes) => {
      assertBytes("fromBeBytes")
      return fromLeBytes(Uint8Array.from(bytes).reverse())
    },
    fromLeBytes,

    // iteration
    // Every yielded `i` lies between `start` and `end`, both values of the type.
    range: function* (start, end) {
      yield* Iterable.map(
        iterateWhile<R>(
          start,
          (i) => P.lt(i, end),
          (i) => P.add(i, P.one)
        ),
        (i) => inRangeByConstruction(i)
      )
    },
    rangeInclusive: function* (start, end) {
      yield* Iterable.map(
        iterateWhile<R>(
          start,
          (i) => !P.lt(end, i),
          (i) => P.add(i, P.one)
        ),
        (i) => inRangeByConstruction(i)
      )
    }
  }
  return self
}
