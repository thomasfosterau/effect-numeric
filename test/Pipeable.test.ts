import { describe, expect, it } from "vite-plus/test"
import * as Complex from "../src/Complex.ts"
import * as Ratio from "../src/Ratio.ts"

describe("Pipeable values", () => {
  it("Ratio values pipe through data-last operators", () => {
    expect(Ratio.make(1, 3).pipe(Ratio.add(Ratio.make(1, 6)), Ratio.toString)).toBe("1/2")
  })

  it("Complex values pipe through data-last operators", () => {
    expect(Complex.make(3, 4).pipe(Complex.mul(Complex.i), Complex.conj, Complex.toString)).toBe("-4-3i")
  })
})
