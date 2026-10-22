import { describe, expect, it } from "vite-plus/test"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import { pipe } from "effect/Function"
import * as Result from "effect/Result"
import * as fc from "fast-check"
import { Checked, I8, I64, Integer, Num, Overflowing, Saturating, U8, U64, Wrapping } from "../src/index.ts"

describe("Wrapping", () => {
  it("is a lawful ring modulo 2^bits", () => {
    const W = Wrapping.I8
    const arb = fc.integer({ min: -128, max: 127 }).map(I8.make)
    fc.assert(
      fc.property(arb, arb, arb, (a, b, c) => {
        expect(W.add(W.add(a, b), c)).toBe(W.add(a, W.add(b, c)))
        expect(W.mul(W.mul(a, b), c)).toBe(W.mul(a, W.mul(b, c)))
        expect(W.mul(a, W.add(b, c))).toBe(W.add(W.mul(a, b), W.mul(a, c)))
        expect(W.add(a, W.negate(a))).toBe(W.zero)
        expect(W.sub(a, b)).toBe(W.add(a, W.negate(b)))
      })
    )
  })
  it("works with generic algorithms", () => {
    expect(Num.sum(Wrapping.U8)([U8.make(200), U8.make(100)])).toBe(44)
    expect(Num.pow(Wrapping.U8)(U8.make(2), 9)).toBe(0)
    expect(pipe(U8.make(250), Wrapping.U8.add(U8.make(10)))).toBe(4)
    expect(Wrapping.U8.from(-1)).toBe(255)
    expect(Wrapping.sum(U64)([U64.MAX, U64.one])).toBe(0n)
    expect(Integer.gcd(Wrapping.I64)(I64.make(-12n), I64.make(18n))).toBe(6n)
  })
  it("throws on division by zero", () => {
    expect(() => Wrapping.I8.div(I8.one, I8.zero)).toThrow(/divide by zero/)
  })
})

describe("Saturating", () => {
  it("clamps", () => {
    const S = Saturating.I8
    expect(S.add(I8.make(100), I8.make(100))).toBe(127)
    expect(S.sub(I8.make(-100), I8.make(100))).toBe(-128)
    expect(S.mul(I8.make(-100), I8.make(2))).toBe(-128)
    expect(S.div(I8.MIN, I8.make(-1))).toBe(127)
    expect(S.rem(I8.MIN, I8.make(-1))).toBe(0)
    expect(S.negate(I8.MIN)).toBe(127)
    expect(S.abs(I8.MIN)).toBe(127)
    expect(S.pow(I8.make(-2), 9)).toBe(-128)
    expect(S.from(1e9)).toBe(127)
    expect(Saturating.sum(U8)([U8.make(200), U8.make(100), U8.make(1)])).toBe(255)
    expect(Saturating.U8.negate(U8.make(5))).toBe(0)
  })
})

describe("Checked", () => {
  it("returns options", () => {
    expect(Checked.U8.add(U8.make(200), U8.make(100))).toEqual(Option.none())
    expect(Checked.U8.add(U8.make(1), U8.make(2))).toEqual(Option.some(3))
    expect(Checked.U8.sum([U8.make(100), U8.make(100), U8.make(100)])).toEqual(Option.none())
    expect(Checked.sum(U8)([U8.make(100), U8.make(100)])).toEqual(Option.some(200))
    expect(Checked.product(I64)([I64.make(1n << 31n), I64.make(1n << 31n), I64.make(2n)])).toEqual(Option.none())
    expect(Checked.U8.div(U8.one, U8.zero)).toEqual(Option.none())
    expect(Checked.I8.neg(I8.MIN)).toEqual(Option.none())
    expect(Checked.I8.shl(I8.one, 8)).toEqual(Option.none())
  })
})

describe("Overflowing", () => {
  it("reports overflow", () => {
    expect(Overflowing.U8.add(U8.MAX, U8.one)).toEqual([0, true])
    expect(Overflowing.U8.add(U8.one, U8.one)).toEqual([2, false])
    expect(Overflowing.U8.sum([U8.MAX, U8.one, U8.one])).toEqual([1, true])
    expect(Overflowing.I8.neg(I8.MIN)).toEqual([-128, true])
  })
})

describe("Result-returning arithmetic in Effect", () => {
  it("fails with typed errors", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const ok = yield* Effect.fromResult(U8.add(U8.make(1), U8.make(2)))
        expect(ok).toBe(3)
        const exit = yield* Effect.exit(Effect.fromResult(U8.add(U8.MAX, U8.one)))
        expect(Exit.isFailure(exit)).toBe(true)
        const tag = yield* Effect.fromResult(U8.div(U8.one, U8.zero)).pipe(
          Effect.catchTag("DivisionByZeroError", (e) => Effect.succeed(e.message))
        )
        expect(tag).toBe("U8: attempt to divide by zero")
      })
    )
  })
  it("errors are yieldable and structurally equal", () => {
    const e = Result.getFailure(I8.add(I8.MAX, I8.one))
    expect(Option.map(e, (x) => [x._tag, x.operation, x.type, x.message])).toEqual(
      Option.some(["OverflowError", "add", "I8", "I8: attempt to add with overflow"])
    )
  })
})
