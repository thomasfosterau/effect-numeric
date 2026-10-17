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
 * result exceeds `limit`. Returns `undefined` on overflow. @internal
 */
export const powBounded = (base: bigint, exp: number, limit: bigint): bigint | undefined => {
  let result = 1n
  let b = base
  let e = exp
  for (;;) {
    if (e % 2 === 1) {
      result *= b
      if (abs(result) > limit) return undefined
    }
    e = Math.floor(e / 2)
    if (e === 0) return result
    b *= b
    if (b > limit) return undefined
  }
}

/** `base ** exp mod 2^bits`, as an unsigned value. @internal */
export const powMod2 = (base: bigint, exp: number, bits: number): bigint => {
  let result = 1n
  let b = BigInt.asUintN(bits, base)
  let e = exp
  while (e > 0) {
    if (e % 2 === 1) result = BigInt.asUintN(bits, result * b)
    e = Math.floor(e / 2)
    if (e > 0) b = BigInt.asUintN(bits, b * b)
  }
  return BigInt.asUintN(bits, result)
}

/**
 * Exact conversion of a `number | bigint` to a `bigint`; `undefined` if the
 * number is not an integer. @internal
 */
export const toBigIntExact = (value: number | bigint): bigint | undefined =>
  typeof value === "bigint" ? value : Number.isInteger(value) ? BigInt(value) : undefined

/** Parses an integer literal with optional sign in the given radix. @internal */
export const parse = (input: string, radix: number): bigint | undefined => {
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) return undefined
  let s = input
  let negative = false
  if (s.startsWith("-") || s.startsWith("+")) {
    negative = s[0] === "-"
    s = s.slice(1)
  }
  if (s.length === 0) return undefined
  const R = BigInt(radix)
  let acc = 0n
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    const d =
      c >= 48 && c <= 57
        ? c - 48
        : c >= 97 && c <= 122
          ? c - 87
          : c >= 65 && c <= 90
            ? c - 55
            : Number.POSITIVE_INFINITY
    if (d >= radix) return undefined
    acc = acc * R + BigInt(d)
  }
  return negative ? -acc : acc
}

/** @internal */
export const isNonNegativeInteger = (n: number): boolean => Number.isSafeInteger(n) && n >= 0
