import { describe, expect, it } from "@effect/vitest"
import { Equal, Schema } from "effect"
import { Complex, Num } from "../src/index.ts"

const close = Complex.approxEquals(1e-9)

describe("Complex", () => {
  const z = Complex.make(3, 4)
  it("basic arithmetic", () => {
    expect(Complex.abs(z)).toBe(5)
    expect(Complex.toString(Complex.mul(z, Complex.i))).toBe("-4+3i")
    expect(Complex.toString(Complex.conj(z))).toBe("3-4i")
    expect(close(Complex.mul(Complex.div(z, Complex.make(1, -2)), Complex.make(1, -2)), z)).toBe(true)
    expect(close(Complex.mul(z, Complex.recip(z)), Complex.one)).toBe(true)
    expect(Complex.normSqr(z)).toBe(25)
    expect(Equal.equals(Complex.make(1, 2), Complex.make(1, 2))).toBe(true)
    expect(Num.sum(Complex.Field)([z, z])).toEqual(Complex.make(6, 8))
  })
  it("transcendental functions", () => {
    expect(close(Complex.exp(Complex.make(0, Math.PI)), Complex.make(-1, 0))).toBe(true)
    expect(close(Complex.exp(Complex.ln(z)), z)).toBe(true)
    expect(close(Complex.mul(Complex.sqrt(z), Complex.sqrt(z)), z)).toBe(true)
    expect(Complex.sqrt(Complex.make(-4))).toEqual(Complex.make(0, 2))
    expect(close(Complex.powi(z, 3), Complex.mul(z, Complex.mul(z, z)))).toBe(true)
    expect(close(Complex.powi(z, -1), Complex.recip(z))).toBe(true)
    expect(close(Complex.powf(z, 0.5), Complex.sqrt(z))).toBe(true)
    expect(close(Complex.powc(Complex.i, Complex.i), Complex.make(Math.exp(-Math.PI / 2)))).toBe(true)
    const s = Complex.sin(z)
    const c = Complex.cos(z)
    expect(close(Complex.add(Complex.mul(s, s), Complex.mul(c, c)), Complex.one)).toBe(true)
    expect(close(Complex.tanh(Complex.zero), Complex.zero)).toBe(true)
    const [r, t] = Complex.toPolar(z)
    expect(close(Complex.fromPolar(r, t), z)).toBe(true)
  })
  it("schemas", () => {
    const decoded = Schema.decodeUnknownSync(Complex.schemaFromStruct)({ re: 1, im: -1 })
    expect(Complex.toString(decoded)).toBe("1-1i")
    expect(Schema.encodeSync(Complex.schemaFromStruct)(z)).toEqual({ re: 3, im: 4 })
  })
})
