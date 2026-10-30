import { describe, expect, it } from "vite-plus/test"
import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { F32, Float } from "../src/index.ts"

describe("Float.F64", () => {
  const F = Float.F64
  it("total order", () => {
    const sorted = Arr.sort([3, Number.NaN, 0, -0, -1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY], F.Order)
    expect(sorted.map((x) => (Object.is(x, -0) ? "-0" : String(x)))).toEqual([
      "-Infinity",
      "-1",
      "-0",
      "0",
      "3",
      "Infinity",
      "NaN"
    ])
    expect(F.Equivalence(Number.NaN, Number.NaN)).toBe(true)
    expect(F.Equivalence(0, -0)).toBe(false)
  })
  it("rounding", () => {
    expect(F.round(2.5)).toBe(3)
    expect(F.round(-2.5)).toBe(-3)
    expect(F.roundTiesEven(2.5)).toBe(2)
    expect(F.roundTiesEven(3.5)).toBe(4)
    expect(F.roundTiesEven(-2.5)).toBe(-2)
    expect(F.roundTiesEven(2.4)).toBe(2)
    expect(F.fract(-1.25)).toBe(-0.25)
    expect(F.trunc(-1.7)).toBe(-1)
  })
  it("next representable values", () => {
    expect(F.nextUp(1)).toBe(1 + Number.EPSILON)
    expect(F.nextDown(1)).toBe(1 - Number.EPSILON / 2)
    expect(F.nextUp(0)).toBe(Number.MIN_VALUE)
    expect(F.nextUp(-Number.MIN_VALUE)).toBe(-0)
    expect(F.nextDown(0)).toBe(-Number.MIN_VALUE)
    expect(F.nextUp(Number.MAX_VALUE)).toBe(Number.POSITIVE_INFINITY)
    expect(F.nextUp(Number.NEGATIVE_INFINITY)).toBe(-Number.MAX_VALUE)
  })
  it("classification and sign", () => {
    expect(F.isSubnormal(Number.MIN_VALUE)).toBe(true)
    expect(F.isNormal(1)).toBe(true)
    expect(F.isNormal(0)).toBe(false)
    expect(F.isSignNegative(-0)).toBe(true)
    expect(F.signum(-0)).toBe(-1)
    expect(F.signum(0)).toBe(1)
    expect(F.copysign(3, -0)).toBe(-3)
    expect(F.min(Number.NaN, 1)).toBe(1)
    expect(F.max(2, Number.NaN)).toBe(2)
    expect(F.log(8, 2)).toBeCloseTo(3)
    expect(F.powi(2, 10)).toBe(1024)
    expect(F.toDegrees(Math.PI)).toBe(180)
  })
})

describe("F32", () => {
  it("rounds to single precision", () => {
    const x = F32.from(0.1)
    expect(x).toBe(Math.fround(0.1))
    expect(F32.add(x, x)).toBe(Math.fround(x + x))
    expect(F32.is(0.1)).toBe(false)
    expect(F32.is(0.5)).toBe(true)
    expect(F32.nextUp(F32.from(1))).toBe(1 + 2 ** -23)
    expect(F32.nextDown(F32.from(1))).toBe(1 - 2 ** -24)
    expect(F32.from(1e39)).toBe(Number.POSITIVE_INFINITY)
    expect(F32.maxFinite).toBe(3.4028234663852886e38)
    expect(Result.isFailure(Schema.decodeUnknownResult(F32.schema)(0.1))).toBe(true)
    expect(Schema.decodeUnknownResult(F32.schemaRounding)(0.1)).toEqual(Result.succeed(Math.fround(0.1)))
  })
})

describe("NotNaN / Finite", () => {
  it("refines", () => {
    expect(Float.NotNaN.option(Number.NaN)).toEqual(Option.none())
    expect(Float.NotNaN(1)).toBe(1)
    expect(() => Float.NotNaN(Number.NaN)).toThrow(/not NaN/)
    const inf = Float.NotNaN(Number.POSITIVE_INFINITY)
    expect(Float.NotNaN.sub(inf, inf)).toEqual(Option.none())
    expect(Float.Finite.mul(Float.Finite(1e300), Float.Finite(1e300))).toEqual(Option.none())
    expect(Float.Finite.add(Float.Finite(1), Float.Finite(2))).toEqual(Option.some(3))
    expect(Float.Finite.is(Number.POSITIVE_INFINITY)).toBe(false)
    expect(Result.isFailure(Schema.decodeUnknownResult(Float.Finite.schema)(Number.NaN))).toBe(true)
    expect(Schema.decodeUnknownResult(Float.Finite.schema)(1.5)).toEqual(Result.succeed(1.5))
  })
})
