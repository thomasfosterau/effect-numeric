import { describe, expect, it } from "@effect/vitest"
import { Equal, HashSet, Option, pipe, Result, Schema } from "effect"
import * as fc from "fast-check"
import { Float, Ratio } from "../src/index.ts"

const arbRatio = fc
  .tuple(fc.bigInt({ min: -(10n ** 12n), max: 10n ** 12n }), fc.bigInt({ min: 1n, max: 10n ** 12n }))
  .map(([n, d]) => Ratio.make(n, d))

describe("Ratio", () => {
  it("normalises", () => {
    const r = Ratio.make(6, -8)
    expect([r.numer, r.denom]).toEqual([-3n, 4n])
    expect(Ratio.toString(Ratio.make(4, 2))).toBe("2")
    expect(Ratio.make(0, -5)).toBe(Ratio.zero)
    expect(() => Ratio.make(1, 0)).toThrow(/by zero/)
    expect(() => Ratio.make(1.5)).toThrow(RangeError)
    expect(Result.isFailure(Ratio.fromFraction(1n, 0n))).toBe(true)
  })
  it("structural equality and hashing", () => {
    expect(Equal.equals(Ratio.make(1, 2), Ratio.make(2, 4))).toBe(true)
    expect(HashSet.size(HashSet.make(Ratio.make(1, 2), Ratio.make(3, 6), Ratio.make(1, 3)))).toBe(2)
  })
  it("field laws", () => {
    fc.assert(
      fc.property(arbRatio, arbRatio, arbRatio, (a, b, c) => {
        expect(Ratio.Equivalence(Ratio.add(Ratio.add(a, b), c), Ratio.add(a, Ratio.add(b, c)))).toBe(true)
        expect(Ratio.Equivalence(Ratio.mul(a, Ratio.add(b, c)), Ratio.add(Ratio.mul(a, b), Ratio.mul(a, c)))).toBe(true)
        expect(Ratio.Equivalence(Ratio.sub(Ratio.add(a, b), b), a)).toBe(true)
        if (!Ratio.isZero(b)) {
          expect(Ratio.Equivalence(Ratio.mul(Result.getOrThrow(Ratio.div(a, b)), b), a)).toBe(true)
        }
        expect(Ratio.Order(a, b)).toBe(Math.sign(Ratio.toNumber(a) - Ratio.toNumber(b)) || Ratio.Order(a, b))
      })
    )
  })
  it("arithmetic", () => {
    const a = Ratio.make(1, 3)
    const b = Ratio.make(1, 6)
    expect(Ratio.toString(Ratio.add(a, b))).toBe("1/2")
    expect(pipe(a, Ratio.mul(b), Ratio.toString)).toBe("1/18")
    expect(Ratio.checkedDiv(a, Ratio.zero)).toEqual(Option.none())
    expect(Result.isFailure(Ratio.recip(Ratio.zero))).toBe(true)
    expect(Ratio.toString(Result.getOrThrow(Ratio.pow(Ratio.make(2, 3), -2)))).toBe("9/4")
    expect(Result.isFailure(Ratio.pow(Ratio.zero, -1))).toBe(true)
    expect(Ratio.toString(Ratio.mediant(Ratio.make(1, 2), Ratio.make(2, 3)))).toBe("3/5")
    expect(() => Ratio.Field.div(a, Ratio.zero)).toThrow(/by zero/)
    expect(Ratio.sign(Ratio.make(-1, 2))).toBe(-1)
    expect(Ratio.toString(Ratio.abs(Ratio.make(-1, 2)))).toBe("1/2")
  })
  it("rounding", () => {
    const cases: ReadonlyArray<[number, number, bigint, bigint, bigint, bigint]> = [
      // n, d, floor, ceil, trunc, round
      [7, 2, 3n, 4n, 3n, 4n],
      [-7, 2, -4n, -3n, -3n, -4n],
      [5, 3, 1n, 2n, 1n, 2n],
      [-5, 3, -2n, -1n, -1n, -2n],
      [4, 1, 4n, 4n, 4n, 4n]
    ]
    for (const [n, d, fl, ce, tr, ro] of cases) {
      const r = Ratio.make(n, d)
      expect([Ratio.floor(r), Ratio.ceil(r), Ratio.trunc(r), Ratio.round(r)]).toEqual([fl, ce, tr, ro])
    }
    expect(Ratio.toString(Ratio.fract(Ratio.make(-7, 2)))).toBe("-1/2")
    expect(Ratio.toFixed(Ratio.make(2, 3), 4)).toBe("0.6667")
    expect(Ratio.toFixed(Ratio.make(-1, 8), 2)).toBe("-0.13")
    expect(Ratio.toFixed(Ratio.make(5, 2), 0)).toBe("3")
  })
  it("conversions", () => {
    expect(Ratio.toString(Option.getOrThrow(Ratio.fromNumber(0.375)))).toBe("3/8")
    expect(Ratio.toString(Option.getOrThrow(Ratio.fromNumber(0.1)))).toBe("3602879701896397/36028797018963968")
    expect(Ratio.fromNumber(Number.NaN)).toEqual(Option.none())
    expect(Ratio.toNumber(Option.getOrThrow(Ratio.fromNumber(Number.MIN_VALUE)))).toBe(Number.MIN_VALUE)
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true }), (x) => {
        expect(Ratio.toNumber(Option.getOrThrow(Ratio.fromNumber(x)))).toBe(x + 0)
      })
    )
    expect(Option.map(Ratio.approximate(Math.PI, 1000n), Ratio.toString)).toEqual(Option.some("355/113"))
    expect(Option.map(Ratio.approximate(0.333333, 100n), Ratio.toString)).toEqual(Option.some("1/3"))
    expect(Ratio.toNumber(Ratio.make(10n ** 400n + 1n, 10n ** 399n))).toBe(10)
    expect(Ratio.toNumber(Ratio.make(10n ** 400n))).toBe(Number.POSITIVE_INFINITY)
    expect(Ratio.toNumber(Ratio.make(-1n, 10n ** 400n))).toBe(-0)
    // exact halfway between two doubles rounds to even
    expect(Ratio.toNumber(Ratio.make(2n ** 60n + 2n ** 7n))).toBe(2 ** 60)
    expect(Ratio.toNumber(Ratio.make(2n ** 60n + 3n * 2n ** 7n))).toBe(2 ** 60 + 2 ** 9)
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 30n }), fc.bigInt({ min: 1n, max: 10n ** 30n }), (n, d) => {
        // compare against a correctly rounded reference using exact float decomposition
        const x = Ratio.toNumber(Ratio.make(n, d))
        const r = Ratio.make(n, d)
        const lo = Option.getOrThrow(Ratio.fromNumber(Float.F64.nextDown(x)))
        const hi = Option.getOrThrow(Ratio.fromNumber(Float.F64.nextUp(x)))
        const xr = Option.getOrThrow(Ratio.fromNumber(x))
        const dist = (q: Ratio.Ratio) => Ratio.abs(Ratio.sub(q, r))
        expect(Ratio.Order(dist(xr), dist(lo))).toBeLessThanOrEqual(0)
        expect(Ratio.Order(dist(xr), dist(hi))).toBeLessThanOrEqual(0)
      })
    )
  })
  it("parse and schemas", () => {
    expect(Option.map(Ratio.parse("3/-6"), Ratio.toString)).toEqual(Option.some("-1/2"))
    expect(Option.map(Ratio.parse("-1.25e1"), Ratio.toString)).toEqual(Option.some("-25/2"))
    expect(Option.map(Ratio.parse(".5"), Ratio.toString)).toEqual(Option.some("1/2"))
    expect(Option.map(Ratio.parse("42"), Ratio.toString)).toEqual(Option.some("42"))
    expect(Ratio.parse("1/0")).toEqual(Option.none())
    expect(Ratio.parse("abc")).toEqual(Option.none())
    expect(Ratio.parse(".")).toEqual(Option.none())
    const decoded = Schema.decodeUnknownSync(Ratio.schemaFromString)("2/4")
    expect(Ratio.toString(decoded)).toBe("1/2")
    expect(Schema.encodeSync(Ratio.schemaFromString)(Ratio.make(3, 4))).toBe("3/4")
    expect(Result.isFailure(Schema.decodeUnknownResult(Ratio.schemaFromString)("x"))).toBe(true)
    expect(String(Ratio.make(1, 2))).toBe("1/2")
  })
})
