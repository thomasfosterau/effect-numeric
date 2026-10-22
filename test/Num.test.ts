import { describe, expect, it } from "vite-plus/test"
import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import { Integer, Num, Ratio } from "../src/index.ts"

describe("Num", () => {
  it("generic folds", () => {
    expect(Num.sum(Num.number)([1, 2, 3])).toBe(6)
    expect(Num.product(Num.bigint)([2n, 3n, 4n])).toBe(24n)
    expect(Num.pow(Num.bigint)(3n, 40)).toBe(3n ** 40n)
    expect(Num.pow(Num.bigint)(0)(3n)).toBe(1n)
    expect(() => Num.pow(Num.number)(2, -1)).toThrow(RangeError)
    expect(Num.square(Num.number)(5)).toBe(25)
    expect(Num.mulAdd(Num.number)(2, 3, 4)).toBe(10)
    expect(Num.isPositive(Num.bigint)(1n)).toBe(true)
    expect(Num.isNegative(Num.number)(-1)).toBe(true)
    expect(Num.clamp(Num.number.Order, 0, 10)(11)).toBe(10)
    expect(Ratio.toString(Num.sum(Ratio.Field)([Ratio.make(1, 2), Ratio.make(1, 3)]))).toBe("5/6")
  })
  it("instances", () => {
    expect(Num.number.signum(-3)).toBe(-1)
    expect(Num.number.div(1, 0)).toBe(Number.POSITIVE_INFINITY)
    expect(Num.bigint.signum(-3n)).toBe(-1n)
    expect(() => Num.bigint.div(1n, 0n)).toThrow(/divide by zero/)
    expect(() => Num.bigint.rem(1n, 0n)).toThrow(/by zero/)
  })
})

describe("Integer", () => {
  const I = Num.bigint
  it("gcd / lcm", () => {
    expect(Integer.gcd(I)(12n, -18n)).toBe(6n)
    expect(Integer.gcd(I)(0n, 0n)).toBe(0n)
    expect(Integer.lcm(I)(4n, -6n)).toBe(12n)
    expect(Integer.lcm(I)(0n, 6n)).toBe(0n)
  })
  it.each([
    [240n, 46n],
    [-7n, 3n],
    [0n, 5n],
    [17n, -51n]
  ] as const)("extendedGcd(%s, %s) gives Bézout coefficients", (a, b) => {
    const { gcd, x, y } = Integer.extendedGcd(I)(a, b)
    expect(a * x + b * y).toBe(gcd)
    expect(gcd).toBe(Integer.gcd(I)(a, b))
  })
  it("floored / ceiled division", () => {
    expect(Integer.divFloor(I)(-7n, 2n)).toBe(-4n)
    expect(Integer.modFloor(I)(-7n, 2n)).toBe(1n)
    expect(Integer.modFloor(I)(7n, -2n)).toBe(-1n)
    expect(Integer.divCeil(I)(7n, 2n)).toBe(4n)
    expect(Integer.divCeil(I)(-7n, 2n)).toBe(-3n)
    expect(Integer.divRem(I)(-7n, 2n)).toEqual([-3n, -1n])
    expect(Integer.nextMultipleOf(I)(10n, 4n)).toBe(12n)
    expect(Integer.nextMultipleOf(I)(12n, 4n)).toBe(12n)
    expect(Integer.prevMultipleOf(I)(10n, 4n)).toBe(8n)
    expect(Integer.isEven(I)(4n)).toBe(true)
    expect(Integer.isOdd(I)(-3n)).toBe(true)
    expect(Integer.isMultipleOf(I)(0n, 0n)).toBe(true)
    expect(Integer.isMultipleOf(I)(9n, 3n)).toBe(true)
  })
  it("roots", () => {
    expect(Integer.sqrt(10n ** 40n + 1n)).toEqual(Option.some(10n ** 20n))
    expect(Integer.sqrt(-1n)).toEqual(Option.none())
    expect(Integer.cbrt(-28n)).toBe(-3n)
    expect(Integer.nthRoot(2n ** 100n, 10)).toEqual(Option.some(1024n))
    expect(Integer.nthRoot(2n ** 100n - 1n, 10)).toEqual(Option.some(1023n))
    expect(Integer.nthRoot(-16n, 4)).toEqual(Option.none())
    expect(Integer.nthRoot(-27n, 3)).toEqual(Option.some(-3n))
  })
  it("combinatorics and modular arithmetic", () => {
    expect(Integer.factorial(20n)).toEqual(Option.some(2432902008176640000n))
    expect(Integer.factorial(-1n)).toEqual(Option.none())
    expect(Integer.binomial(50n, 25n)).toBe(126410606437752n)
    expect(Integer.binomial(5n, 6n)).toBe(0n)
    expect(Integer.modPow(4n, 13n, 497n)).toBe(445n)
    expect(Integer.modPow(-2n, 3n, 5n)).toBe(2n)
    expect(Integer.modInverse(3n, 11n)).toEqual(Option.some(4n))
    expect(Integer.modInverse(2n, 4n)).toEqual(Option.none())
  })
  it("isPrime", () => {
    // Trial division up to the square root, as an obviously correct reference.
    const isPrimeReference = (n: number) =>
      n >= 2 && Arr.every(Arr.range(2, Math.max(2, Math.floor(Math.sqrt(n)))), (d) => d * d > n || n % d !== 0)
    const upTo5000 = Arr.makeBy(5001, (i) => i)
    expect(Arr.map(upTo5000, (i) => Integer.isPrime(BigInt(i)))).toEqual(Arr.map(upTo5000, isPrimeReference))
    expect(Integer.isPrime(2n ** 61n - 1n)).toBe(true)
    expect(Integer.isPrime(2n ** 61n + 1n)).toBe(false)
    expect(Integer.isPrime(3215031751n)).toBe(false) // strong pseudoprime to bases 2, 3, 5, 7
  })
})
