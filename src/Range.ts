/**
 * Numeric ranges for any ordered numeric type (Rust's `num-iter`).
 *
 * Ranges are lazy `IterableIterator`s, so they compose with
 * `effect/Iterable`, `Array.fromIterable` and `Stream.fromIterable`.
 *
 * @example
 * ```ts
 * import { Num, Range, Ratio } from "effect-numeric"
 *
 * Array.from(Range.range(Num.number)(0, 3))                 // [0, 1, 2]
 * Array.from(Range.rangeStep(Num.bigint)(10n, 0n, -3n))     // [10n, 7n, 4n, 1n]
 * Array.from(Range.rangeInclusive(Ratio.Field)(Ratio.zero, Ratio.make(2)))
 * ```
 *
 * @since 0.1.0
 */
import type { OrderedNum } from "./Num.ts"

/**
 * Values `start, start + 1, …` strictly below `end`.
 *
 * @category constructors
 * @since 0.1.0
 */
export const range = <A>(N: OrderedNum<A>) =>
  function* (start: A, end: A): IterableIterator<A> {
    for (let x = start; N.Order(x, end) < 0; x = N.add(x, N.one)) yield x
  }

/**
 * Values `start, start + 1, …` up to and including `end`.
 *
 * @category constructors
 * @since 0.1.0
 */
export const rangeInclusive = <A>(N: OrderedNum<A>) =>
  function* (start: A, end: A): IterableIterator<A> {
    for (let x = start; N.Order(x, end) <= 0; x = N.add(x, N.one)) yield x
  }

/**
 * Values `start, start + step, …` strictly before `end`. A negative step
 * counts down. Throws a `RangeError` if `step` is zero.
 *
 * @category constructors
 * @since 0.1.0
 */
export const rangeStep = <A>(N: OrderedNum<A>) =>
  function* (start: A, end: A, step: A): IterableIterator<A> {
    const dir = N.Order(step, N.zero)
    if (dir === 0) throw new RangeError("Range.rangeStep: step must not be zero")
    for (let x = start; N.Order(x, end) === -dir; x = N.add(x, step)) yield x
  }

/**
 * Values `start, start + step, …` up to and including `end`. A negative step
 * counts down. Throws a `RangeError` if `step` is zero.
 *
 * @category constructors
 * @since 0.1.0
 */
export const rangeStepInclusive = <A>(N: OrderedNum<A>) =>
  function* (start: A, end: A, step: A): IterableIterator<A> {
    const dir = N.Order(step, N.zero)
    if (dir === 0) throw new RangeError("Range.rangeStepInclusive: step must not be zero")
    for (let x = start; N.Order(x, end) !== dir; x = N.add(x, step)) yield x
  }

/**
 * `count` evenly spaced values from `start` to `end` inclusive (NumPy's
 * `linspace`).
 *
 * @category constructors
 * @since 0.1.0
 */
export function* linspace(start: number, end: number, count: number): IterableIterator<number> {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("Range.linspace: count must be >= 0")
  if (count === 1) {
    yield start
    return
  }
  for (let k = 0; k < count; k++) yield k === count - 1 ? end : start + ((end - start) * k) / (count - 1)
}
