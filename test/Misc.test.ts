import { inspect } from "node:util"
import { describe, expect, it } from "vite-plus/test"
import { Option } from "effect"
import { ArithmeticError, Complex, Float, I8, Ratio, U8 } from "../src/index.ts"

describe("value objects", () => {
  it("are pipeable and inspectable", () => {
    const r = Ratio.make(1, 2).pipe(Ratio.add(Ratio.make(1, 4)))
    expect(Ratio.toString(r)).toBe("3/4")
    expect(inspect(r)).toBe("3/4")
    expect(JSON.stringify(r)).toBe('{"_id":"Ratio","numer":"3","denom":"4"}')
    const z = Complex.make(1, -0).pipe(Complex.scale(2))
    expect(inspect(z)).toBe("2-0i")
    expect(JSON.stringify(z)).toBe('{"_id":"Complex","re":2,"im":0}')
    expect(Ratio.isRatio(r)).toBe(true)
    expect(Ratio.isRatio({})).toBe(false)
    expect(Complex.isComplex(z)).toBe(true)
  })
})

describe("ArithmeticError", () => {
  it("guards", () => {
    const e = Option.getOrThrow(
      Option.flatMap(Option.some(I8.add(I8.MAX, I8.one)), (r) =>
        r._tag === "Failure" ? Option.some(r.failure) : Option.none()
      )
    )
    expect(ArithmeticError.isArithmeticError(e)).toBe(true)
    expect(ArithmeticError.isArithmeticError(new Error("x"))).toBe(false)
    expect(e).toBeInstanceOf(Error)
    const parse = U8.parse("zz")
    expect(parse._tag === "Failure" && ArithmeticError.isArithmeticError(parse.failure)).toBe(true)
  })
})

describe("Float misc", () => {
  it("covers the remaining operations", () => {
    const F = Float.F64
    expect(F.clamp(5, 0, 1)).toBe(1)
    expect(F.isInfinite(Number.NEGATIVE_INFINITY)).toBe(true)
    expect(F.mulAdd(2, 3, 4)).toBe(10)
    expect(F.hypot(3, 4)).toBe(5)
    expect(F.recip(4)).toBe(0.25)
    expect(F.toRadians(180)).toBe(Math.PI)
    expect(F.exp2(3)).toBe(8)
    expect(F.signum(Number.NaN)).toBeNaN()
    expect(Float.totalOrder(1, 1)).toBe(0)
    expect(Float.totalOrder(Number.NaN, 1)).toBe(1)
  })
})
