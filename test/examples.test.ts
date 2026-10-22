// Keeps the examples in README.md honest.
import { describe, expect, it } from "vite-plus/test"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import * as Option from "effect/Option"
import { pipe } from "effect/Function"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import {
  Checked,
  Clamped,
  Complex,
  F32,
  Float,
  I8,
  I64,
  Integer,
  Num,
  Overflowing,
  Range,
  Ratio,
  Saturating,
  U8,
  U64,
  Wrapping
} from "../src/index.ts"

describe("README", () => {
  it("fixed-width integers", () => {
    const a = U8.make(200)
    const b = U8.make(100)
    expect(Result.isFailure(U8.add(a, b))).toBe(true)
    expect(U8.checkedAdd(a, b)).toEqual(Option.none())
    expect(U8.wrappingAdd(a, b)).toBe(44)
    expect(U8.saturatingAdd(a, b)).toBe(255)
    expect(U8.overflowingAdd(a, b)).toEqual([44, true])
    expect(pipe(a, U8.saturatingSub(b))).toBe(100)
    expect(U8.from(256)).toEqual(Option.none())
    expect(U8.wrappingFrom(-1)).toBe(255)
    expect(U8.saturatingFrom(1e9)).toBe(255)
    expect(I8.checkedDiv(I8.MIN, I8.make(-1))).toEqual(Option.none())
    expect(I8.remEuclid(I8.make(-7), I8.make(3))).toEqual(Result.succeed(2))
    expect(U64.wrappingMul(U64.MAX, U64.MAX)).toBe(1n)
    expect(Schema.decodeUnknownSync(U8.schema)(42)).toBe(42)
    expect(Schema.decodeUnknownSync(U64.schemaFromString)("18446744073709551615")).toBe(U64.MAX)
  })

  it("Effect integration", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const a = U8.make(200)
        const b = U8.make(100)
        const program = Effect.gen(function* () {
          const total = yield* Effect.fromResult(U8.add(a, b))
          return total
        }).pipe(Effect.catchTag("OverflowError", () => Effect.succeed(U8.MAX)))
        expect(yield* program).toBe(255)
      })
    )
  })

  it("strategies", () => {
    expect(Wrapping.U8.add(U8.make(250), U8.make(10))).toBe(4)
    expect(Num.sum(Wrapping.U8)([U8.make(200), U8.make(100)])).toBe(44)
    expect(Saturating.I8.mul(I8.make(-100), I8.make(2))).toBe(-128)
    expect(Checked.U8.sum([U8.make(100), U8.make(200)])).toEqual(Option.none())
    expect(Overflowing.U8.add(U8.MAX, U8.one)).toEqual([0, true])
    expect(Integer.gcd(Wrapping.I64)(I64.make(-12n), I64.make(18n))).toBe(6n)
  })

  it("clamped", () => {
    const Volume = Clamped.int({ min: 0, max: 11 })
    expect(Volume.make(42)).toBe(11)
    expect(Volume.from(42)).toEqual(Option.none())
    expect(Volume.add(Volume.make(10), 5)).toBe(11)
    const Hue = Clamped.make({ min: 0, max: 360 })
    expect(Hue.wrap(370)).toBe(10)
    expect(Hue.rescale(Clamped.Percentage)(Hue.make(90))).toBe(25)
    expect(Clamped.UnitInterval.make(1.5)).toBe(1)
  })

  it("floats", () => {
    expect(Arr.sort([3, Number.NaN, -0, 0, -1], Float.F64.Order)).toEqual([-1, -0, 0, 3, Number.NaN])
    expect(Float.F64.roundTiesEven(2.5)).toBe(2)
    expect(Float.F64.nextUp(1)).toBe(1.0000000000000002)
    expect(F32.add(F32.from(0.1), F32.from(0.2))).toBe(Math.fround(Math.fround(0.1) + Math.fround(0.2)))
    expect(Float.Finite.mul(Float.Finite(1e300), Float.Finite(1e300))).toEqual(Option.none())
    expect(Float.NotNaN.option(Number.NaN)).toEqual(Option.none())
  })

  it("ratio and complex", () => {
    const third = Ratio.make(1, 3)
    expect(pipe(third, Ratio.add(Ratio.make(1, 6)), Ratio.toString)).toBe("1/2")
    expect(Equal.equals(Ratio.make(2, 4), Ratio.make(1, 2))).toBe(true)
    expect(Option.map(Ratio.approximate(Math.PI, 1000n), Ratio.toString)).toEqual(Option.some("355/113"))
    expect(Ratio.toFixed(Ratio.make(2, 3), 4)).toBe("0.6667")
    const z = Complex.make(3, 4)
    expect(Complex.abs(z)).toBe(5)
    expect(Complex.toString(Complex.mul(z, Complex.i))).toBe("-4+3i")
  })

  it("generic code", () => {
    const mean =
      <A>(N: Num.Fractional<A>, fromCount: (n: number) => A) =>
      (xs: ReadonlyArray<A>) =>
        N.div(Num.sum(N)(xs), fromCount(xs.length))
    expect(Ratio.toString(mean(Ratio.Field, Ratio.fromInteger)([Ratio.make(1), Ratio.make(2)]))).toBe("3/2")
    expect(Integer.extendedGcd(Num.bigint)(240n, 46n)).toEqual({ gcd: 2n, x: -9n, y: 47n })
    expect(Integer.divFloor(Num.bigint)(-7n, 2n)).toBe(-4n)
    expect(Integer.isPrime(2n ** 61n - 1n)).toBe(true)
    expect(Integer.modPow(4n, 13n, 497n)).toBe(445n)
    expect(Array.from(Range.rangeStep(Num.bigint)(10n, 0n, -3n))).toEqual([10n, 7n, 4n, 1n])
  })
})
