/**
 * Integer algorithms in the spirit of Rust's `num-integer` crate.
 *
 * The first group of functions is generic over any {@link Integral}
 * instance (native `bigint`, or the `Wrapping` / `Saturating` fixed-width
 * instances). The second group works on arbitrary precision `bigint`s.
 *
 * @example
 * ```ts
 * import { Integer, Num } from "effect-numeric"
 *
 * Integer.gcd(Num.bigint)(12n, 18n)      // 6n
 * Integer.divFloor(Num.bigint)(-7n, 2n)  // -4n
 * Integer.binomial(50n, 25n)             // 126410606437752n
 * ```
 *
 * @since 0.1.0
 */
import * as Option from "effect/Option"
import { DivisionByZeroError } from "./ArithmeticError.ts"
import * as big from "./internal/bigint.ts"
import { euclid, extendedEuclid } from "./internal/iterate.ts"
import { bigint as bigintIntegral, type Integral } from "./Num.ts"

// -----------------------------------------------------------------------------
// generic
// -----------------------------------------------------------------------------

const sign = <A>(I: Integral<A>, a: A): number => I.Order(a, I.zero)
const absWith = <A>(I: Integral<A>, a: A): A => (sign(I, a) < 0 ? I.sub(I.zero, a) : a)

/**
 * Greatest common divisor (always non-negative).
 *
 * @category generic
 * @since 0.1.0
 */
export const gcd =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A =>
    euclid(I, absWith(I, a), absWith(I, b))

/**
 * Least common multiple (always non-negative; zero if either argument is zero).
 *
 * @category generic
 * @since 0.1.0
 */
export const lcm =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A => {
    if (I.isZero(a) || I.isZero(b)) return I.zero
    return absWith(I, I.mul(I.div(a, gcd(I)(a, b)), b))
  }

/**
 * Extended Euclidean algorithm: returns `gcd` together with Bézout
 * coefficients `x` and `y` such that `a * x + b * y = gcd`.
 *
 * @category generic
 * @since 0.1.0
 */
export const extendedGcd =
  <A>(I: Integral<A>) =>
  (a: A, b: A): { readonly gcd: A; readonly x: A; readonly y: A } => {
    const [r, s, t] = extendedEuclid(I, a, b)
    return sign(I, r) < 0 ? { gcd: I.sub(I.zero, r), x: I.sub(I.zero, s), y: I.sub(I.zero, t) } : { gcd: r, x: s, y: t }
  }

/**
 * Truncated division and remainder at once.
 *
 * @category generic
 * @since 0.1.0
 */
export const divRem =
  <A>(I: Integral<A>) =>
  (a: A, b: A): readonly [A, A] => [I.div(a, b), I.rem(a, b)]

/**
 * Floored division and modulo at once: the remainder has the sign of the
 * divisor.
 *
 * @category generic
 * @since 0.1.0
 */
export const divModFloor =
  <A>(I: Integral<A>) =>
  (a: A, b: A): readonly [A, A] => {
    const q = I.div(a, b)
    const r = I.rem(a, b)
    if (!I.isZero(r) && sign(I, r) !== sign(I, b)) return [I.sub(q, I.one), I.add(r, b)]
    return [q, r]
  }

/**
 * Division rounding toward negative infinity.
 *
 * @category generic
 * @since 0.1.0
 */
export const divFloor =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A =>
    divModFloor(I)(a, b)[0]

/**
 * Modulo with the sign of the divisor (Python's `%`).
 *
 * @category generic
 * @since 0.1.0
 */
export const modFloor =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A =>
    divModFloor(I)(a, b)[1]

/**
 * Division rounding toward positive infinity.
 *
 * @category generic
 * @since 0.1.0
 */
export const divCeil =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A => {
    const q = I.div(a, b)
    const r = I.rem(a, b)
    return !I.isZero(r) && sign(I, r) === sign(I, b) ? I.add(q, I.one) : q
  }

/**
 * @category generic
 * @since 0.1.0
 */
export const isMultipleOf =
  <A>(I: Integral<A>) =>
  (a: A, b: A): boolean =>
    I.isZero(b) ? I.isZero(a) : I.isZero(I.rem(a, b))

/**
 * @category generic
 * @since 0.1.0
 */
export const isEven =
  <A>(I: Integral<A>) =>
  (a: A): boolean =>
    I.isZero(I.rem(a, I.add(I.one, I.one)))

/**
 * @category generic
 * @since 0.1.0
 */
export const isOdd =
  <A>(I: Integral<A>) =>
  (a: A): boolean =>
    !isEven(I)(a)

/**
 * The smallest multiple of `b` that is `>= a` (for positive `b`).
 *
 * @category generic
 * @since 0.1.0
 */
export const nextMultipleOf =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A => {
    const m = modFloor(I)(a, b)
    return I.isZero(m) ? a : I.add(a, I.sub(b, m))
  }

/**
 * The largest multiple of `b` that is `<= a` (for positive `b`).
 *
 * @category generic
 * @since 0.1.0
 */
export const prevMultipleOf =
  <A>(I: Integral<A>) =>
  (a: A, b: A): A =>
    I.sub(a, modFloor(I)(a, b))

// -----------------------------------------------------------------------------
// bigint
// -----------------------------------------------------------------------------

/**
 * Floor of the square root; `None` for negative input.
 *
 * @category bigint
 * @since 0.1.0
 */
export const sqrt = (n: bigint): Option.Option<bigint> => (n < 0n ? Option.none() : Option.some(big.isqrt(n)))

/**
 * Integer cube root, rounding toward zero.
 *
 * @category bigint
 * @since 0.1.0
 */
export const cbrt = (n: bigint): bigint => (n < 0n ? -big.iroot(-n, 3) : big.iroot(n, 3))

/**
 * Integer `k`-th root rounding toward zero. `None` for an even root of a
 * negative number or a non-positive `k`.
 *
 * @category bigint
 * @since 0.1.0
 */
export const nthRoot = (n: bigint, k: number): Option.Option<bigint> => {
  if (!Number.isSafeInteger(k) || k < 1) return Option.none()
  if (n < 0n) return k % 2 === 0 ? Option.none() : Option.some(-big.iroot(-n, k))
  return Option.some(big.iroot(n, k))
}

/**
 * `n!`. `None` for negative `n`.
 *
 * @category bigint
 * @since 0.1.0
 */
export const factorial = (n: bigint): Option.Option<bigint> => {
  if (n < 0n) return Option.none()
  return Option.some(big.factorial(n))
}

/**
 * The binomial coefficient "n choose k" (zero when `k < 0` or `k > n`).
 *
 * @category bigint
 * @since 0.1.0
 */
export const binomial = (n: bigint, k: bigint): bigint => {
  if (k < 0n || n < 0n || k > n) return 0n
  return big.binomial(n, k)
}

/**
 * `base ** exp mod modulus` for non-negative `exp`. The result is in
 * `[0, |modulus|)`.
 *
 * @category bigint
 * @since 0.1.0
 */
export const modPow = (base: bigint, exp: bigint, modulus: bigint): bigint => {
  if (modulus === 0n) throw new DivisionByZeroError({ operation: "modPow", type: "bigint" })
  if (exp < 0n) throw new RangeError("modPow: exponent must be non-negative")
  const m = big.abs(modulus)
  if (m === 1n) return 0n
  return big.modPow(base, exp, m)
}

/**
 * The multiplicative inverse of `a` modulo `modulus`, if `a` and `modulus`
 * are coprime.
 *
 * @category bigint
 * @since 0.1.0
 */
export const modInverse = (a: bigint, modulus: bigint): Option.Option<bigint> => {
  const m = big.abs(modulus)
  if (m === 0n) return Option.none()
  const { gcd: g, x } = extendedGcd(bigintIntegral)(((a % m) + m) % m, m)
  return g === 1n ? Option.some(((x % m) + m) % m) : Option.none()
}

/**
 * Primality test using Miller–Rabin. The answer is deterministic (exact)
 * for every `n < 3.3 * 10^24`; beyond that it is probabilistic with an error
 * probability below `4^-13`.
 *
 * @category bigint
 * @since 0.1.0
 */
export const isPrime = (n: bigint): boolean => big.isPrime(n)
