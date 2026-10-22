import { describe, expect, it } from "vite-plus/test"
import { Option, Result, Schema } from "effect"
import * as fc from "fast-check"
import { Clamped } from "../src/index.ts"

describe("Clamped", () => {
  const Hue = Clamped.make({ min: 0, max: 360, name: "Hue" })
  const Volume = Clamped.int({ min: 0, max: 11 })

  it("make clamps, from validates", () => {
    expect(Hue.make(400)).toBe(360)
    expect(Hue.make(-1)).toBe(0)
    expect(Hue.from(400)).toEqual(Option.none())
    expect(Hue.from(12.5)).toEqual(Option.some(12.5))
    expect(Volume.from(2.5)).toEqual(Option.none())
    expect(Volume.make(2.7)).toBe(2)
    expect(Result.isFailure(Volume.fromResult(12))).toBe(true)
    expect(() => Hue.make(Number.NaN)).toThrow(/NaN/)
    expect(Hue.is(10)).toBe(true)
    expect(Hue.is(-10)).toBe(false)
    expect(Volume.name).toBe("ClampedInt[0, 11]")
  })

  it("saturating arithmetic", () => {
    const v = Volume.make(10)
    expect(Volume.add(v, 5)).toBe(11)
    expect(Volume.sub(5)(v)).toBe(5)
    expect(Volume.mul(v, -1)).toBe(0)
    expect(Volume.div(v, 3)).toBe(3)
    expect(() => Volume.div(v, 0)).toThrow(/by zero/)
    expect(Volume.map(v, (n) => n * n)).toBe(11)
    expect(Volume.checkedAdd(v, 1)).toEqual(Option.some(11))
    expect(Volume.checkedAdd(v, 2)).toEqual(Option.none())
  })

  it("wrapping", () => {
    expect(Hue.wrap(370)).toBe(10)
    expect(Hue.wrap(-10)).toBe(350)
    expect(Hue.wrap(360)).toBe(0)
    expect(Hue.wrappingAdd(Hue.make(350), 20)).toBe(10)
    expect(Volume.wrap(12)).toBe(0)
    expect(Volume.wrap(-1)).toBe(11)
    expect(Volume.wrappingSub(Volume.make(0), 1)).toBe(11)
    fc.assert(
      fc.property(fc.double({ noNaN: true, noDefaultInfinity: true, min: -1e9, max: 1e9 }), (x) => {
        expect(Hue.is(Hue.wrap(x))).toBe(true)
        expect(Hue.is(Hue.make(x))).toBe(true)
      })
    )
  })

  it("lerp / normalize / rescale", () => {
    const UI = Clamped.UnitInterval
    expect(Hue.lerp(UI.make(0.5))).toBe(180)
    expect(Hue.normalize(Hue.make(90))).toBe(0.25)
    expect(Hue.rescale(Clamped.Percentage)(Hue.make(90))).toBe(25)
    expect(Clamped.SignedUnitInterval.make(-2)).toBe(-1)
    expect(Hue.isMax(Hue.make(1000))).toBe(true)
    expect(Hue.isMin(Hue.min)).toBe(true)
  })

  it("schemas", () => {
    expect(Result.isFailure(Schema.decodeUnknownResult(Volume.schema)(12))).toBe(true)
    expect(Result.isFailure(Schema.decodeUnknownResult(Volume.schema)(1.5))).toBe(true)
    expect(Schema.decodeUnknownResult(Volume.schema)(5)).toEqual(Result.succeed(5))
    expect(Schema.decodeUnknownResult(Volume.schemaClamping)(50)).toEqual(Result.succeed(11))
    expect(Result.isFailure(Schema.decodeUnknownResult(Volume.schemaClamping)(Number.NaN))).toBe(true)
  })

  it("rejects invalid ranges", () => {
    expect(() => Clamped.make({ min: 1, max: 0 })).toThrow()
    expect(() => Clamped.int({ min: 0.5, max: 1 })).toThrow()
    expect(() => Clamped.make({ min: 0, max: Number.POSITIVE_INFINITY })).toThrow()
  })
})
