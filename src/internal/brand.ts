import * as Schema from "effect/Schema"

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
