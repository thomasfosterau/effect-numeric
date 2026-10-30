import type * as Brand from "effect/Brand"
import * as Schema from "effect/Schema"

/**
 * Retypes a representation value as a brand `A` of it, with no runtime check.
 * The single place this library asserts a brand on a value: every module's
 * branding helper (`member`, `value`, `inRangeByConstruction`, …) delegates
 * here, and its doc comment states the invariant its call sites uphold. A
 * brand carries no runtime data, so this is the identity. @internal
 */
export const unsafeBrand = <A extends R, R>(r: R): A =>
  // SAFETY: the caller has established that `r` is a value of `A` (the
  // invariant is stated at each caller); a brand adds no runtime data.
  r as A

/**
 * Views a plain number as the unbranded representation of a numeric brand
 * `A`. `A` is `number & Brand<K>`, so its unbranded type is `number`, but
 * TypeScript cannot reduce `Unbranded<A>` for a generic `A`. @internal
 */
export const unbranded = <A extends number & Brand.Brand<any>>(n: number): Brand.Brand.Unbranded<A> =>
  // SAFETY: `Unbranded<number & Brand<K>>` is `number` for every `K`.
  n as Brand.Brand.Unbranded<A>

/**
 * Retypes a validated representation schema as the caller's branded type
 * `A`, adding `name` as its brand and identifier. The single place this
 * library turns a schema's output type into a caller-chosen brand. @internal
 */
export const brandAs = <A extends R, R extends number | bigint>(
  validated: Schema.Codec<R, R>,
  name: string
): Schema.Codec<A, R> =>
  // SAFETY: `validated`'s checks admit exactly the values the brand `A`
  // stands for (each caller builds them from the same predicate its `is` /
  // `from` use), and a brand carries no runtime data. `Schema.brand` types its
  // key as a single string literal; the runtime key is `name` either way.
  // TypeScript cannot relate a generic `A` to `Schema.brand`'s output type,
  // hence the step through `unknown`.
  validated.pipe(Schema.brand(name as "Brand"), Schema.annotate({ identifier: name })) as unknown as Schema.Codec<A, R>
