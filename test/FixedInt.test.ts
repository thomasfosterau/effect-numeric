import { describe, expect, it } from "vite-plus/test"
import { Option, Result, Schema } from "effect"
import * as fc from "fast-check"
import * as FixedInt from "../src/FixedInt.ts"
import { I8 } from "../src/I8.ts"
import { I16 } from "../src/I16.ts"
import { I32 } from "../src/I32.ts"
import { I64 } from "../src/I64.ts"
import { I128 } from "../src/I128.ts"
import { U8 } from "../src/U8.ts"
import { U16 } from "../src/U16.ts"
import { U32 } from "../src/U32.ts"
import { U64 } from "../src/U64.ts"
import { U128 } from "../src/U128.ts"

type Any = FixedInt.FixedInt<any, any>

const all: ReadonlyArray<Any> = [I8, I16, I32, I64, I128, U8, U16, U32, U64, U128]

const bounds = (T: Any) => {
  const min = BigInt(T.MIN)
  const max = BigInt(T.MAX)
  return { min, max }
}

const arb = (T: Any): fc.Arbitrary<any> => {
  const { min, max } = bounds(T)
  const edges = [min, max, 0n, 1n, min + 1n, max - 1n, max / 2n, ...(T.signed ? [-1n, min / 2n] : [])]
  return fc.oneof(fc.constantFrom(...edges), fc.bigInt({ min, max })).map((b) => T.make(b))
}

const ref = (T: Any) => {
  const { min, max } = bounds(T)
  const inRange = (b: bigint) => b >= min && b <= max
  const wrap = (b: bigint) => (T.signed ? BigInt.asIntN(T.bits, b) : BigInt.asUintN(T.bits, b))
  const clamp = (b: bigint) => (b < min ? min : b > max ? max : b)
  const opt = (b: bigint) => (inRange(b) ? Option.some(T.make(b)) : Option.none())
  return { inRange, wrap, clamp, opt, min, max }
}

const B = (x: number | bigint) => BigInt(x)
const runs = { numRuns: 300 }

describe.each(all.map((T) => [T.name, T] as const))("%s", (_name, T) => {
  const R = ref(T)

  it("constants", () => {
    expect(T.repr).toBe(T.bits <= 32 ? "number" : "bigint")
    expect(B(T.MIN)).toBe(T.signed ? -(1n << B(T.bits - 1)) : 0n)
    expect(B(T.MAX)).toBe(T.signed ? (1n << B(T.bits - 1)) - 1n : (1n << B(T.bits)) - 1n)
    expect(T.isZero(T.zero)).toBe(true)
    expect(T.isOne(T.one)).toBe(true)
  })

  it("from / make / is", () => {
    expect(Option.isSome(T.from(T.MAX))).toBe(true)
    expect(Option.isNone(T.from(R.max + 1n))).toBe(true)
    expect(Option.isNone(T.from(R.min - 1n))).toBe(true)
    expect(Option.isNone(T.from(0.5))).toBe(true)
    expect(Option.isNone(T.from(Number.NaN))).toBe(true)
    expect(() => T.make(R.max + 1n)).toThrow()
    expect(Result.isFailure(T.fromResult(R.max + 1n))).toBe(true)
    expect(T.is(T.MAX)).toBe(true)
    expect(T.is(T.repr === "number" ? 0.5 : 0)).toBe(false)
    expect(T.is("1")).toBe(false)
  })

  it("wrappingFrom / saturatingFrom", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -(1n << 200n), max: 1n << 200n }), (b) => {
        expect(B(T.wrappingFrom(b))).toBe(R.wrap(b))
        expect(B(T.saturatingFrom(b))).toBe(R.clamp(b))
      }),
      runs
    )
    expect(B(T.saturatingFrom(Number.POSITIVE_INFINITY))).toBe(R.max)
    expect(B(T.saturatingFrom(Number.NEGATIVE_INFINITY))).toBe(R.min)
    expect(B(T.saturatingFrom(Number.NaN))).toBe(0n)
    expect(B(T.wrappingFrom(Number.NaN))).toBe(0n)
    expect(B(T.wrappingFrom(-1.9))).toBe(R.wrap(-1n))
    expect(B(T.saturatingFrom(1e300))).toBe(R.max)
  })

  const binary: ReadonlyArray<[string, (a: bigint, b: bigint) => bigint, boolean]> = [
    ["Add", (a, b) => a + b, false],
    ["Sub", (a, b) => a - b, false],
    ["Mul", (a, b) => a * b, false]
  ]
  for (const [op, f] of binary) {
    it(`${op}: checked / wrapping / saturating / overflowing / strict`, () => {
      fc.assert(
        fc.property(arb(T), arb(T), (a, b) => {
          const exact = f(B(a), B(b))
          const lower = op.toLowerCase() as "add" | "sub" | "mul"
          expect((T as any)[`checked${op}`](a, b)).toEqual(R.opt(exact))
          expect(B((T as any)[`wrapping${op}`](a, b))).toBe(R.wrap(exact))
          expect(B((T as any)[`saturating${op}`](a, b))).toBe(R.clamp(exact))
          const [w, o] = (T as any)[`overflowing${op}`](a, b)
          expect([B(w), o]).toEqual([R.wrap(exact), !R.inRange(exact)])
          expect(Result.isSuccess(T[lower](a, b))).toBe(R.inRange(exact))
          // data-last
          expect((T as any)[`checked${op}`](b)(a)).toEqual(R.opt(exact))
        }),
        runs
      )
    })
  }

  it("division family", () => {
    const quot = (a: bigint, b: bigint) => a / b
    const euclid = (a: bigint, b: bigint) => {
      const r = ((a % b) + (b < 0n ? -b : b)) % (b < 0n ? -b : b)
      return [(a - r) / b, r] as const
    }
    fc.assert(
      fc.property(arb(T), arb(T), (a, b) => {
        const A = B(a)
        const Bb = B(b)
        if (Bb === 0n) {
          expect(Option.isNone(T.checkedDiv(a, b))).toBe(true)
          expect(Option.isNone(T.checkedRem(a, b))).toBe(true)
          expect(() => T.wrappingDiv(a, b)).toThrow(/by zero/)
          expect(() => T.saturatingDiv(a, b)).toThrow(/by zero/)
          expect(Result.getFailure(T.div(a, b)).pipe(Option.map((e) => e._tag))).toEqual(
            Option.some("DivisionByZeroError")
          )
          return
        }
        const q = quot(A, Bb)
        const overflowCase = T.signed && A === R.min && Bb === -1n
        expect(T.checkedDiv(a, b)).toEqual(R.opt(q))
        expect(B(T.wrappingDiv(a, b))).toBe(R.wrap(q))
        expect(B(T.saturatingDiv(a, b))).toBe(R.clamp(q))
        expect(T.overflowingDiv(a, b).map((x: any) => (typeof x === "boolean" ? x : B(x)))).toEqual([
          R.wrap(q),
          !R.inRange(q)
        ])
        expect(B(T.wrappingRem(a, b))).toBe(A % Bb)
        expect(Option.isNone(T.checkedRem(a, b))).toBe(overflowCase)
        expect(T.overflowingRem(a, b)[1]).toBe(overflowCase)
        const [eq, er] = euclid(A, Bb)
        expect(T.checkedDivEuclid(a, b)).toEqual(R.opt(eq))
        expect(B(T.wrappingDivEuclid(a, b))).toBe(R.wrap(eq))
        expect(B(T.wrappingRemEuclid(a, b))).toBe(er)
        expect(Option.isNone(T.checkedRemEuclid(a, b))).toBe(overflowCase)
        expect(B(T.midpoint(a, b))).toBe((A + Bb) / 2n)
        expect(T.absDiff(a, b)).toBe(A > Bb ? A - Bb : Bb - A)
      }),
      runs
    )
  })

  it("neg / abs / signum", () => {
    fc.assert(
      fc.property(arb(T), (a) => {
        const A = B(a)
        expect(T.checkedNeg(a)).toEqual(R.opt(-A))
        expect(B(T.wrappingNeg(a))).toBe(R.wrap(-A))
        expect(B(T.saturatingNeg(a))).toBe(R.clamp(-A))
        const absA = A < 0n ? -A : A
        expect(T.checkedAbs(a)).toEqual(R.opt(absA))
        expect(B(T.wrappingAbs(a))).toBe(R.wrap(absA))
        expect(B(T.saturatingAbs(a))).toBe(R.clamp(absA))
        expect(B(T.signum(a))).toBe(A > 0n ? 1n : A < 0n ? -1n : 0n)
        expect(T.isNegative(a)).toBe(A < 0n)
        expect(T.isPositive(a)).toBe(A > 0n)
      }),
      runs
    )
  })

  it("pow", () => {
    fc.assert(
      fc.property(arb(T), fc.oneof(fc.integer({ min: 0, max: 8 }), fc.integer({ min: 0, max: 300 })), (a, e) => {
        const exact = B(a) ** B(e)
        expect(T.checkedPow(a, e)).toEqual(R.opt(exact))
        expect(B(T.wrappingPow(a, e))).toBe(R.wrap(exact))
        expect(B(T.saturatingPow(a, e))).toBe(R.clamp(exact))
        const [w, o] = T.overflowingPow(a, e)
        expect([B(w), o]).toEqual([R.wrap(exact), !R.inRange(exact)])
      }),
      { numRuns: 200 }
    )
    const modPow = (base: bigint, e: bigint, m: bigint) => {
      let r = 1n
      let x = base % m
      while (e > 0n) {
        if (e & 1n) r = (r * x) % m
        x = (x * x) % m
        e >>= 1n
      }
      return r
    }
    expect(B(T.wrappingPow(T.make(3), 1_000_000_007))).toBe(R.wrap(modPow(3n, 1_000_000_007n, 1n << B(T.bits))))
    expect(Result.isFailure(T.pow(T.one, -1))).toBe(true)
    expect(() => T.checkedPow(T.one, 1.5)).toThrow()
  })

  it("shifts and rotations", () => {
    const mask = (1n << B(T.bits)) - 1n
    fc.assert(
      fc.property(arb(T), fc.integer({ min: 0, max: T.bits * 3 }), (a, n) => {
        const A = B(a)
        const k = B(n % T.bits)
        expect(B(T.wrappingShl(a, n))).toBe(R.wrap(A << k))
        expect(B(T.wrappingShr(a, n))).toBe(A >> k)
        expect(Option.isNone(T.checkedShl(a, n))).toBe(n >= T.bits)
        expect(T.overflowingShl(a, n)[1]).toBe(n >= T.bits)
        const u = BigInt.asUintN(T.bits, A)
        const rot = k === 0n ? u : ((u << k) | (u >> (B(T.bits) - k))) & mask
        expect(B(T.rotateLeft(a, n))).toBe(R.wrap(rot))
        expect(T.rotateRight(T.rotateLeft(a, n), n)).toBe(a)
      }),
      runs
    )
  })

  it("bit operations", () => {
    fc.assert(
      fc.property(arb(T), arb(T), (a, b) => {
        const A = B(a)
        const Bb = B(b)
        expect(B(T.bitAnd(a, b))).toBe(R.wrap(A & Bb))
        expect(B(T.bitOr(a, b))).toBe(R.wrap(A | Bb))
        expect(B(T.bitXor(a, b))).toBe(R.wrap(A ^ Bb))
        expect(B(T.bitNot(a))).toBe(R.wrap(~A))
        const bin = BigInt.asUintN(T.bits, A).toString(2).padStart(T.bits, "0")
        expect(T.countOnes(a)).toBe([...bin].filter((c) => c === "1").length)
        expect(T.countZeros(a)).toBe([...bin].filter((c) => c === "0").length)
        expect(T.leadingZeros(a)).toBe(bin.length - bin.replace(/^0+/, "").length)
        expect(T.trailingZeros(a)).toBe(bin.length - bin.replace(/0+$/, "").length)
        expect(T.leadingOnes(a)).toBe(bin.length - bin.replace(/^1+/, "").length)
        expect(T.reverseBits(T.reverseBits(a))).toBe(a)
        expect(B(T.reverseBits(a))).toBe(R.wrap(BigInt(`0b${[...bin].reverse().join("")}`)))
        expect(T.swapBytes(T.swapBytes(a))).toBe(a)
        expect(T.fromBeBytes(T.toBeBytes(a))).toEqual(Option.some(a))
        expect(T.fromLeBytes(T.toLeBytes(a))).toEqual(Option.some(a))
        expect(Array.from(T.toBeBytes(a))).toEqual(Array.from(T.toLeBytes(a)).reverse())
      }),
      runs
    )
  })

  it("isqrt / ilog / powers of two", () => {
    fc.assert(
      fc.property(arb(T), (a) => {
        const A = B(a)
        if (A < 0n) {
          expect(Option.isNone(T.checkedIsqrt(a))).toBe(true)
        } else {
          const r = B(Option.getOrThrow(T.checkedIsqrt(a)))
          expect(r * r <= A && (r + 1n) * (r + 1n) > A).toBe(true)
        }
        if (A <= 0n) {
          expect(Option.isNone(T.checkedIlog2(a))).toBe(true)
          expect(Result.isFailure(T.ilog10(a))).toBe(true)
        } else {
          expect(Option.getOrThrow(T.checkedIlog2(a))).toBe(A.toString(2).length - 1)
          expect(Option.getOrThrow(T.checkedIlog10(a))).toBe(A.toString().length - 1)
          expect(Option.getOrThrow(T.checkedIlog(a, T.make(3)))).toBe(
            (() => {
              let n = 0
              let x = A
              while (x >= 3n) {
                x /= 3n
                n++
              }
              return n
            })()
          )
        }
        expect(T.isPowerOfTwo(a)).toBe(A > 0n && (A & (A - 1n)) === 0n)
        const next = A <= 1n ? 1n : 1n << B((A - 1n).toString(2).length)
        expect(T.checkedNextPowerOfTwo(a)).toEqual(R.opt(next))
      }),
      runs
    )
  })

  it("parse / toString", () => {
    fc.assert(
      fc.property(arb(T), fc.integer({ min: 2, max: 36 }), (a, radix) => {
        expect(T.parse(T.toString(a, radix), radix)).toEqual(Result.succeed(a))
      }),
      runs
    )
    expect(Result.getFailure(T.parse("")).pipe(Option.map((e) => e._tag))).toEqual(Option.some("ParseError"))
    expect(Result.getFailure(T.parse("12x")).pipe(Option.map((e) => e._tag))).toEqual(Option.some("ParseError"))
    expect(Result.getFailure(T.parse((R.max + 1n).toString())).pipe(Option.map((e) => e._tag))).toEqual(
      Option.some("OutOfRangeError")
    )
    expect(T.parse("+1")).toEqual(Result.succeed(T.one))
  })

  it("schemas", () => {
    const decode = Schema.decodeUnknownResult(T.schema)
    expect(Result.isSuccess(decode(T.MAX))).toBe(true)
    expect(Result.isFailure(decode(T.repr === "number" ? Number(R.max) + 1 : R.max + 1n))).toBe(true)
    expect(Result.isFailure(decode("1"))).toBe(true)
    const fromString = Schema.decodeUnknownResult(T.schemaFromString)
    expect(fromString(R.max.toString())).toEqual(Result.succeed(T.MAX))
    expect(Result.isFailure(fromString((R.max + 1n).toString()))).toBe(true)
    expect(Schema.encodeSync(T.schemaFromString)(T.MAX)).toBe(R.max.toString())
  })

  it("order, min/max/clamp, ranges", () => {
    const one = T.one
    const two = T.make(2)
    expect(T.Order(one, two)).toBe(-1)
    expect(T.min(one, two)).toBe(one)
    expect(T.max(two)(one)).toBe(two)
    expect(T.clamp(T.MAX, one, two)).toBe(two)
    expect([...T.range(T.zero, T.make(3))].map(B)).toEqual([0n, 1n, 2n])
    expect([...T.rangeInclusive(T.make(R.max - 1n), T.MAX)].map(B)).toEqual([R.max - 1n, R.max])
  })
})

describe("custom widths", () => {
  it("U4", () => {
    const U4 = FixedInt.make<number & { readonly U4: unique symbol }>({ name: "U4", bits: 4, signed: false })
    expect(U4.MAX).toBe(15)
    expect(U4.wrappingAdd(U4.make(15), U4.make(1))).toBe(0)
    expect(() => U4.swapBytes(U4.one)).toThrow(/multiple of 8/)
  })
  it("I256", () => {
    const I256 = FixedInt.makeBig<bigint & { readonly I256: unique symbol }>({ name: "I256", bits: 256, signed: true })
    expect(I256.MAX).toBe((1n << 255n) - 1n)
    expect(Option.isNone(I256.checkedAdd(I256.MAX, I256.one))).toBe(true)
  })
  it("rejects invalid widths", () => {
    expect(() => FixedInt.make({ name: "X", bits: 33, signed: true })).toThrow()
    expect(() => FixedInt.makeBig({ name: "X", bits: 0, signed: true })).toThrow()
  })
  it("convert", () => {
    expect(FixedInt.convert(U8)(I16.make(255))).toEqual(Option.some(255))
    expect(FixedInt.convert(U8)(I16.make(-1))).toEqual(Option.none())
    expect(FixedInt.convert(I64)(U32.MAX)).toEqual(Option.some(4294967295n))
  })
  it("normalises negative zero", () => {
    expect(Object.is(I32.wrappingMul(I32.zero, I32.make(-3)), 0)).toBe(true)
    expect(Object.is(I32.make(-0), 0)).toBe(true)
    expect(Object.is(Option.getOrThrow(I32.checkedMul(I32.zero, I32.make(-3))), 0)).toBe(true)
    expect(Object.is(I32.wrappingRem(I32.make(-4), I32.make(2)), 0)).toBe(true)
  })
})
