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
  (a: A, b: A): A => {
    let x = absWith(I, a)
    let y = absWith(I, b)
    while (!I.isZero(y)) {
      const r = I.rem(x, y)
      x = y
      y = r
    }
    return x
  }

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
    let [oldR, r] = [a, b]
    let [oldS, s] = [I.one, I.zero]
    let [oldT, t] = [I.zero, I.one]
    while (!I.isZero(r)) {
      const q = I.div(oldR, r)
      ;[oldR, r] = [r, I.sub(oldR, I.mul(q, r))]
      ;[oldS, s] = [s, I.sub(oldS, I.mul(q, s))]
      ;[oldT, t] = [t, I.sub(oldT, I.mul(q, t))]
    }
    if (sign(I, oldR) < 0) {
      return { gcd: I.sub(I.zero, oldR), x: I.sub(I.zero, oldS), y: I.sub(I.zero, oldT) }
    }
    return { gcd: oldR, x: oldS, y: oldT }
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
  let acc = 1n
  for (let i = 2n; i <= n; i++) acc *= i
  return Option.some(acc)
}

/**
 * The binomial coefficient "n choose k" (zero when `k < 0` or `k > n`).
 *
 * @category bigint
 * @since 0.1.0
 */
export const binomial = (n: bigint, k: bigint): bigint => {
  if (k < 0n || n < 0n || k > n) return 0n
  const kk = k > n - k ? n - k : k
  let acc = 1n
  for (let i = 1n; i <= kk; i++) acc = (acc * (n - kk + i)) / i
  return acc
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
  let result = 1n
  let b = ((base % m) + m) % m
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % m
    e >>= 1n
    b = (b * b) % m
  }
  return result
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

const SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n]

/**
 * Primality test using Miller–Rabin. The answer is deterministic (exact)
 * for every `n < 3.3 * 10^24`; beyond that it is probabilistic with an error
 * probability below `4^-13`.
 *
 * @category bigint
 * @since 0.1.0
 */
export const isPrime = (n: bigint): boolean => {
  if (n < 2n) return false
  for (const p of SMALL_PRIMES) {
    if (n === p) return true
    if (n % p === 0n) return false
  }
  let d = n - 1n
  let s = 0
  while ((d & 1n) === 0n) {
    d >>= 1n
    s++
  }
  outer: for (const a of SMALL_PRIMES) {
    let x = modPow(a, d, n)
    if (x === 1n || x === n - 1n) continue
    for (let i = 1; i < s; i++) {
      x = (x * x) % n
      if (x === n - 1n) continue outer
    }
    return false
  }
  return true
}
