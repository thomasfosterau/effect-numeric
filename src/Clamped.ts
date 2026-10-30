/**
 * Clamped (range-bounded) numbers.
 *
 * A clamped type is a `number` brand constrained to a closed interval
 * `[min, max]`. The bounds are tracked at the type level, so a
 * `Clamped<0, 1>` cannot be confused with a `Clamped<0, 100>`.
 *
 * Arithmetic on clamped values saturates at the bounds of the range, and
 * conversions come in clamping (`make`), validating (`from`) and wrapping
 * (`wrap`) flavours.
 *
 * @example
 * ```ts
 * import { Clamped } from "effect-numeric"
 *
 * const Volume = Clamped.int({ min: 0, max: 11 })
 * type Volume = Clamped.ValueOf<typeof Volume>
 *
 * const v = Volume.make(10)
 * Volume.add(v, 5)       // 11 (saturated)
 * Volume.from(12)        // Option.none()
 *
 * const Hue = Clamped.make({ min: 0, max: 360 })
 * Hue.wrap(370)          // 10
 *
 * Clamped.UnitInterval.make(1.5) // 1
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as Effect from "effect/Effect"
import * as Equivalence from "effect/Equivalence"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Predicate from "effect/Predicate"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import * as SchemaIssue from "effect/SchemaIssue"
import { DivisionByZeroError, DomainError, OutOfRangeError } from "./ArithmeticError.ts"
import { brandAs, unsafeBrand } from "./internal/brand.ts"
import { type Bounded, type Operator, operator } from "./Num.ts"

/**
 * A real number in `[Min, Max]`.
 *
 * @category models
 * @since 0.1.0
 */
export type Clamped<Min extends number, Max extends number> = number & Brand.Brand<`Clamped[${Min}, ${Max}]`>

/**
 * An integer in `[Min, Max]`.
 *
 * @category models
 * @since 0.1.0
 */
export type ClampedInt<Min extends number, Max extends number> = number & Brand.Brand<`ClampedInt[${Min}, ${Max}]`>

/**
 * A number in `[0, 1]`, e.g. a probability or an opacity.
 *
 * @category models
 * @since 0.1.0
 */
export type UnitInterval = Clamped<0, 1>

/**
 * A number in `[-1, 1]`.
 *
 * @category models
 * @since 0.1.0
 */
export type SignedUnitInterval = Clamped<-1, 1>

/**
 * A number in `[0, 100]`.
 *
 * @category models
 * @since 0.1.0
 */
export type Percentage = Clamped<0, 100>

/**
 * Options for defining a clamped type.
 *
 * @category models
 * @since 0.1.0
 */
export interface Options<Min extends number, Max extends number> {
  readonly min: Min
  readonly max: Max
  /** Name used in error messages and schema annotations. */
  readonly name?: string | undefined
}

/**
 * The operations available on a clamped type `A`.
 *
 * Arithmetic operations take a plain `number` as the second operand and
 * saturate the result to the range. Division by zero throws a
 * `DivisionByZeroError`; operations producing `NaN` throw a `DomainError`.
 *
 * @category models
 * @since 0.1.0
 */
export interface ClampedModule<A extends number> extends Bounded<A> {
  readonly name: string
  readonly min: A
  readonly max: A
  /** Whether values are restricted to integers. */
  readonly integer: boolean
  readonly Order: Order.Order<A>
  readonly Equivalence: Equivalence.Equivalence<A>
  /** Strict schema: rejects values outside of the range. */
  readonly schema: Schema.Codec<A, number>
  /** Lenient schema: clamps out of range values while decoding. */
  readonly schemaClamping: Schema.Codec<A, number>

  /** Type guard. */
  readonly is: (u: unknown) => u is A
  /**
   * Clamps a number into the range (integer types truncate toward zero
   * first). Throws a `DomainError` for `NaN`.
   */
  readonly make: (n: number) => A
  /** Returns `Some` only if the number is already a member of the type. */
  readonly from: (n: number) => Option.Option<A>
  /** Like {@link from} but describes the failure. */
  readonly fromResult: (n: number) => Result.Result<A, OutOfRangeError>
  /**
   * Wraps a number into the range modulo its width. For real types the
   * range is treated as half-open `[min, max)`, for integer types as
   * `[min, max]` (width `max - min + 1`).
   */
  readonly wrap: (n: number) => A

  readonly add: Operator<A, number, A>
  readonly sub: Operator<A, number, A>
  readonly mul: Operator<A, number, A>
  readonly div: Operator<A, number, A>
  /** Applies a function to the underlying number and clamps the result. */
  readonly map: Operator<A, (n: number) => number, A>
  /** Like `add` but wraps around the range instead of saturating. */
  readonly wrappingAdd: Operator<A, number, A>
  /** Like `sub` but wraps around the range instead of saturating. */
  readonly wrappingSub: Operator<A, number, A>
  /** `None` if the exact result is out of range. */
  readonly checkedAdd: Operator<A, number, Option.Option<A>>
  /** `None` if the exact result is out of range. */
  readonly checkedSub: Operator<A, number, Option.Option<A>>

  /** Linear interpolation: `t = 0` gives `min`, `t = 1` gives `max`. */
  readonly lerp: (t: UnitInterval) => A
  /** The relative position of a value in the range, in `[0, 1]`. */
  readonly normalize: (self: A) => UnitInterval
  /** Maps a value linearly onto another clamped range. */
  readonly rescale: <B extends number>(to: ClampedModule<B>) => (self: A) => B
  readonly isMin: (self: A) => boolean
  readonly isMax: (self: A) => boolean
}

/**
 * Extracts the value type of a {@link ClampedModule}.
 *
 * @category type-level
 * @since 0.1.0
 */
export type ValueOf<T> = T extends ClampedModule<infer A> ? A : never

/**
 * Defines a clamped real number type in `[min, max]`.
 *
 * @category constructors
 * @since 0.1.0
 */
export const make = <const Min extends number, const Max extends number>(
  options: Options<Min, Max>
): ClampedModule<Clamped<Min, Max>> => build(options, false)

/**
 * Defines a clamped integer type in `[min, max]`. Both bounds must be safe
 * integers.
 *
 * @category constructors
 * @since 0.1.0
 */
export const int = <const Min extends number, const Max extends number>(
  options: Options<Min, Max>
): ClampedModule<ClampedInt<Min, Max>> => {
  if (!Number.isSafeInteger(options.min) || !Number.isSafeInteger(options.max)) {
    throw new RangeError(`Clamped.int: bounds must be safe integers, got [${options.min}, ${options.max}]`)
  }
  return build(options, true)
}

/** Normalises `-0` to `0`. */
const norm = (n: number) => n + 0

const build = <A extends number>(options: Options<number, number>, integer: boolean): ClampedModule<A> => {
  const { min, max } = options
  if (!(Number.isFinite(min) && Number.isFinite(max)) || min > max) {
    throw new RangeError(`Clamped: invalid range [${min}, ${max}]`)
  }
  const name = options.name ?? `${integer ? "ClampedInt" : "Clamped"}[${min}, ${max}]`
  const width = max - min
  const isMember = (n: number) => n >= min && n <= max && (!integer || Number.isInteger(n))
  /** Brands a number that is a member of the type (in range, and integral when `integer`). */
  const member = (n: number): A =>
    // SAFETY: every caller passes `min`, `max`, a value that passed
    // `isMember`, or a value it has clamped / wrapped into `[min, max]`
    // (truncated first when `integer`).
    unsafeBrand<A, number>(n)
  const clamp = (n: number, operation = "clamp"): A => {
    if (Number.isNaN(n)) throw new DomainError({ operation, type: name, reason: "result is NaN" })
    const m = integer ? Math.trunc(n) : n
    return member(norm(m < min ? min : m > max ? max : m))
  }
  const wrap = (n: number): A => {
    if (!Number.isFinite(n)) throw new DomainError({ operation: "wrap", type: name, reason: `cannot wrap ${n}` })
    const m = integer ? Math.trunc(n) : n
    const w = integer ? width + 1 : width
    if (w === 0) return member(min)
    const r = (((m - min) % w) + w) % w
    return member(norm(min + r))
  }
  const from = (n: number): Option.Option<A> => (isMember(n) ? Option.some(member(norm(n))) : Option.none())
  const exact = (n: number) => (integer ? Math.trunc(n) : n)
  /** Position of a member in the range, in `[0, 1]`. */
  const position = (a: A): UnitInterval =>
    // SAFETY: `min <= a <= max`, so `(a - min) / width` lies in `[0, 1]`
    // (and a zero-width range maps to 0).
    unsafeBrand<UnitInterval, number>(width === 0 ? 0 : (a - min) / width)

  const schema = brandAs<A, number>(
    Schema.Number.pipe(
      Schema.check(Schema.isBetween({ minimum: min, maximum: max }), ...(integer ? [Schema.isInt()] : []))
    ),
    name
  )
  const schemaClamping: Schema.Codec<A, number> = Schema.Number.pipe(
    Schema.decodeTo(schema, {
      decode: SchemaGetter.transformEffect((n: number) =>
        Number.isNaN(n)
          ? Effect.fail(new SchemaIssue.InvalidValue({ message: "expected a number, got NaN" }, n))
          : Effect.succeed(clamp(n))
      ),
      encode: SchemaGetter.transform((a: number) => a)
    })
  )

  const self: ClampedModule<A> = {
    name,
    min: member(min),
    max: member(max),
    minValue: member(min),
    maxValue: member(max),
    integer,
    Order: Order.Number,
    Equivalence: Equivalence.Number,
    schema,
    schemaClamping,
    is: (u): u is A => Predicate.isNumber(u) && isMember(u),
    make: (n) => clamp(n, "make"),
    from,
    fromResult: (n) =>
      isMember(n)
        ? Result.succeed(member(norm(n)))
        : Result.fail(new OutOfRangeError({ type: name, value: n, min, max })),
    wrap,
    add: operator((a: A, b: number) => clamp(a + b, "add")),
    sub: operator((a: A, b: number) => clamp(a - b, "subtract")),
    mul: operator((a: A, b: number) => clamp(a * b, "multiply")),
    div: operator((a: A, b: number) => {
      if (b === 0) throw new DivisionByZeroError({ operation: "divide", type: name })
      return clamp(a / b, "divide")
    }),
    map: operator((a: A, f: (n: number) => number) => clamp(f(a), "map")),
    wrappingAdd: operator((a: A, b: number) => wrap(a + b)),
    wrappingSub: operator((a: A, b: number) => wrap(a - b)),
    checkedAdd: operator((a: A, b: number) => from(exact(a + b))),
    checkedSub: operator((a: A, b: number) => from(exact(a - b))),
    lerp: (t) => clamp(min + t * width, "lerp"),
    normalize: position,
    rescale: (to) => (a) => to.lerp(position(a)),
    isMin: (a) => a === min,
    isMax: (a) => a === max
  }
  return self
}

/**
 * Numbers in `[0, 1]`.
 *
 * @category instances
 * @since 0.1.0
 */
export const UnitInterval: ClampedModule<UnitInterval> = /* @__PURE__ */ make({ min: 0, max: 1, name: "UnitInterval" })

/**
 * Numbers in `[-1, 1]`.
 *
 * @category instances
 * @since 0.1.0
 */
export const SignedUnitInterval: ClampedModule<SignedUnitInterval> = /* @__PURE__ */ make({
  min: -1,
  max: 1,
  name: "SignedUnitInterval"
})

/**
 * Numbers in `[0, 100]`.
 *
 * @category instances
 * @since 0.1.0
 */
export const Percentage: ClampedModule<Percentage> = /* @__PURE__ */ make({ min: 0, max: 100, name: "Percentage" })
