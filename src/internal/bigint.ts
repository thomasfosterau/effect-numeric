import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Str from "effect/String"
import { powBySquaring } from "./iterate.ts"

/** @internal */
export const abs = (n: bigint): bigint => (n < 0n ? -n : n)

/** Number of bits needed to represent `n >= 0` (0 for 0). @internal */
export const bitLength = (n: bigint): number => (n === 0n ? 0 : n.toString(2).length)

/** Floor of the square root of `n >= 0`. @internal */
export const isqrt = (n: bigint): bigint => {
  if (n < 2n) return n
  if (n < 9007199254740992n) {
    let r = BigInt(Math.floor(Math.sqrt(Number(n))))
    while (r * r > n) r--
    while ((r + 1n) * (r + 1n) <= n) r++
    return r
  }
  // Newton's method starting from a power of two above the root.
  let x = 1n << BigInt(Math.ceil(bitLength(n) / 2))
  for (;;) {
    const y = (x + n / x) >> 1n
    if (y >= x) return x
    x = y
  }
}

/** Floor of the `k`-th root of `n >= 0`, `k >= 1`. @internal */
export const iroot = (n: bigint, k: number): bigint => {
  if (k === 1 || n < 2n) return n
  if (k === 2) return isqrt(n)
  const K = BigInt(k)
  let x = 1n << BigInt(Math.ceil(bitLength(n) / k))
  for (;;) {
    const y = ((K - 1n) * x + n / x ** (K - 1n)) / K
    if (y >= x) return x
    x = y
  }
}

/** Floor of `log_base(n)` for `n >= 1`, `base >= 2`. @internal */
export const ilog = (n: bigint, base: bigint): number => {
  if (base === 2n) return bitLength(n) - 1
  if (base === 10n) return n.toString().length - 1
  let count = 0
  let x = n
  while (x >= base) {
    x /= base
    count++
  }
  return count
}

/**
 * Exponentiation by squaring that gives up as soon as the magnitude of the
 * result exceeds `limit`. `None` on overflow. @internal
 */
export const powBounded = (base: bigint, exp: number, limit: bigint): Option.Option<bigint> => {
  let result = 1n
  let b = base
  let e = exp
  for (;;) {
    if (e % 2 === 1) {
      result *= b
      if (abs(result) > limit) return Option.none()
    }
    e = Math.floor(e / 2)
    if (e === 0) return Option.some(result)
    b *= b
    if (b > limit) return Option.none()
  }
}

/** `base ** exp mod 2^bits`, as an unsigned value. @internal */
export const powMod2 = (base: bigint, exp: number, bits: number): bigint =>
  BigInt.asUintN(
    bits,
    powBySquaring(1n, (x: bigint, y: bigint) => BigInt.asUintN(bits, x * y), BigInt.asUintN(bits, base), exp)
  )

/**
 * Exact conversion of a `number | bigint` to a `bigint`; `None` if the
 * number is not an integer. @internal
 */
export const toBigIntExact = (value: number | bigint): Option.Option<bigint> =>
  Predicate.isBigInt(value) ? Option.some(value) : Number.isInteger(value) ? Option.some(BigInt(value)) : Option.none()

/** Digit value of a character code in bases up to 36 (`Infinity` if none). */
const digitValue = (c: number): number =>
  c >= 48 && c <= 57 ? c - 48 : c >= 97 && c <= 122 ? c - 87 : c >= 65 && c <= 90 ? c - 55 : Number.POSITIVE_INFINITY

/** Parses an integer literal with optional sign in the given radix. @internal */
export const parse = (input: string, radix: number): Option.Option<bigint> => {
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) return Option.none()
  const negative = input.startsWith("-")
  const s = negative || input.startsWith("+") ? input.slice(1) : input
  if (Str.isEmpty(s)) return Option.none()
  const R = BigInt(radix)
  let acc = 0n
  for (let i = 0; i < s.length; i++) {
    const d = digitValue(s.charCodeAt(i))
    if (d >= radix) return Option.none()
    acc = acc * R + BigInt(d)
  }
  return Option.some(negative ? -acc : acc)
}

/** @internal */
export const isNonNegativeInteger = (n: number): boolean => Number.isSafeInteger(n) && n >= 0

/** Number of trailing zero bits of `u > 0`. @internal */
export const trailingZeros = (u: bigint): number => {
  let x = u
  let n = 0
  while ((x & 1n) === 0n) {
    x >>= 1n
    n++
  }
  return n
}

/** `n!` for `n >= 0`. @internal */
export const factorial = (n: bigint): bigint => {
  let acc = 1n
  for (let i = 2n; i <= n; i++) acc *= i
  return acc
}

/** "n choose k" for `0 <= k <= n`. @internal */
export const binomial = (n: bigint, k: bigint): bigint => {
  const kk = k > n - k ? n - k : k
  let acc = 1n
  for (let i = 1n; i <= kk; i++) acc = (acc * (n - kk + i)) / i
  return acc
}

/** `base ** exp mod m` for `exp >= 0`, `m >= 2`; the result is in `[0, m)`. @internal */
export const modPow = (base: bigint, exp: bigint, m: bigint): bigint => {
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

/** Euclid's algorithm on bigints (always non-negative). @internal */
export const gcd = (a: bigint, b: bigint): bigint => {
  let x = abs(a)
  let y = abs(b)
  while (y !== 0n) [x, y] = [y, x % y]
  return x
}

const SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n]

/**
 * Trial division by the small primes: `Some(verdict)` when it settles `n`
 * (`n >= 2`), `None` when Miller–Rabin has to decide.
 */
const smallPrimeVerdict = (n: bigint): Option.Option<boolean> =>
  Option.match(
    Arr.findFirst(SMALL_PRIMES, (p) => n === p || n % p === 0n),
    {
      onNone: () => Option.none(),
      onSome: (p) => Option.some(n === p)
    }
  )

/** `n - 1 = d * 2^s` with `d` odd, for odd `n >= 3`. */
const oddPart = (n: bigint): readonly [d: bigint, s: number] => {
  let d = n - 1n
  let s = 0
  while ((d & 1n) === 0n) {
    d >>= 1n
    s++
  }
  return [d, s]
}

/** Whether `n` passes the Miller–Rabin round for witness `a` (`n - 1 = d * 2^s`). */
const passesWitness = (n: bigint, d: bigint, s: number, a: bigint): boolean => {
  let x = modPow(a, d, n)
  if (x === 1n || x === n - 1n) return true
  for (let i = 1; i < s; i++) {
    x = (x * x) % n
    if (x === n - 1n) return true
  }
  return false
}

/** Miller–Rabin over the first 13 primes as witnesses. @internal */
export const isPrime = (n: bigint): boolean => {
  if (n < 2n) return false
  return Option.getOrElse(smallPrimeVerdict(n), () => {
    const [d, s] = oddPart(n)
    return Arr.every(SMALL_PRIMES, (a) => passesWitness(n, d, s, a))
  })
}

/**
 * The last two continued-fraction convergents `p0/q0`, `p1/q1` of `n/d`
 * (`d > 0`) whose denominators stay at most `maxDenominator`, as used by
 * `Ratio.limitDenominator`. `floorDiv` is floor division. @internal
 */
export const convergents = (
  n0: bigint,
  d0: bigint,
  maxDenominator: bigint,
  floorDiv: (a: bigint, b: bigint) => bigint
): readonly [p0: bigint, q0: bigint, p1: bigint, q1: bigint] => {
  let [p0, q0, p1, q1] = [0n, 1n, 1n, 0n]
  let [n, d] = [n0, d0]
  for (;;) {
    const a = floorDiv(n, d)
    const q2 = q0 + a * q1
    if (q2 > maxDenominator) break
    ;[p0, q0, p1, q1] = [p1, q1, p0 + a * p1, q2]
    ;[n, d] = [d, n - a * d]
  }
  return [p0, q0, p1, q1]
}
