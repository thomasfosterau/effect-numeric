/**
 * IEEE 754 single precision floats (Rust's `f32`).
 *
 * Values are branded JavaScript numbers that are exactly representable as
 * 32-bit floats. Every operation rounds its result with `Math.fround`, so
 * arithmetic matches single precision hardware semantics.
 *
 * @example
 * ```ts
 * import { F32 } from "effect-numeric"
 *
 * const x = F32.from(0.1) // 0.10000000149011612
 * F32.add(x, x)           // 0.20000000298023224
 * ```
 *
 * @since 0.1.0
 */
import type * as Brand from "effect/Brand"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"
import { type Float, makeFloat } from "./Float.ts"
import { brandAs } from "./internal/brand.ts"

/**
 * A single precision floating point number.
 *
 * @category models
 * @since 0.1.0
 */
export type F32 = number & Brand.Brand<"F32">

/**
 * Operations on {@link F32} values.
 *
 * @category models
 * @since 0.1.0
 */
export interface F32Module extends Float<F32> {
  /** Type guard: is `u` a number exactly representable as an `f32`? */
  readonly is: (u: unknown) => u is F32
  /** Schema validating that a number is exactly representable as an `f32`. */
  readonly schema: Schema.Codec<F32, number>
  /** Schema rounding any number to the nearest `f32` while decoding. */
  readonly schemaRounding: Schema.Codec<F32, number>
}

const f32View = new DataView(new ArrayBuffer(4))
const nextUp32 = (n: number): number => {
  const x = Math.fround(n)
  if (Number.isNaN(x) || x === Number.POSITIVE_INFINITY) return x
  if (x === 0) return 2 ** -149
  f32View.setFloat32(0, x)
  const bits = f32View.getInt32(0)
  f32View.setInt32(0, x > 0 ? bits + 1 : bits - 1)
  return f32View.getFloat32(0)
}

const isF32 = <T>(u: T): u is T & F32 => Predicate.isNumber(u) && (Number.isNaN(u) || Math.fround(u) === u)

const schema = brandAs<F32, number>(
  Schema.Number.pipe(
    Schema.check(
      Schema.makeFilter((n: number) => isF32(n) || "Expected a number representable as a 32-bit float", {
        // The identifier names the JSON Schema definition of the encoded number.
        identifier: "F32Encoded",
        title: "f32",
        description: "A number exactly representable as an IEEE 754 single precision float"
      })
    )
  ),
  "F32"
)

/**
 * The `f32` instance.
 *
 * @category instances
 * @since 0.1.0
 */
export const F32: F32Module = /* @__PURE__ */ Object.assign(
  makeFloat<F32>({
    round: Math.fround,
    mantissaDigits: 24,
    epsilon: 2 ** -23,
    minPositive: 2 ** -126,
    maxFinite: (2 - 2 ** -23) * 2 ** 127,
    nextUp: nextUp32
  }),
  {
    is: isF32,
    schema,
    schemaRounding: Schema.Number.pipe(
      Schema.decodeTo(schema, {
        decode: SchemaGetter.transform(Math.fround),
        encode: SchemaGetter.transform((n: number) => n)
      })
    )
  }
)
