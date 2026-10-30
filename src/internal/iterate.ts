import * as Option from "effect/Option"

/**
 * Lazily yields `start`, `next(start)`, … while `cont` holds. A generator,
 * so nothing is computed until the caller iterates.
 *
 * @yields Each value of the sequence, starting with `start`.
 * @internal
 */
export function* iterateWhile<A>(start: A, cont: (a: A) => boolean, next: (a: A) => A): IterableIterator<A> {
  for (let x = start; cont(x); x = next(x)) yield x
}

/**
 * `count` evenly spaced values from `start` to `end` inclusive (`count >= 2`),
 * with the last value exactly `end`.
 *
 * @yields The `count` values, in order.
 * @internal
 */
export function* evenlySpaced(start: number, end: number, count: number): IterableIterator<number> {
  for (let k = 0; k < count; k++) yield k === count - 1 ? end : start + ((end - start) * k) / (count - 1)
}

/**
 * Left fold that stops at the first `None` `f` returns, without consuming
 * the rest of the (possibly lazy or unbounded) iterable. @internal
 */
export const foldWhileSome = <A, B>(values: Iterable<A>, initial: B, f: (acc: B, a: A) => Option.Option<B>) => {
  let acc = initial
  for (const a of values) {
    const next = f(acc, a)
    if (Option.isNone(next)) return next
    acc = next.value
  }
  return Option.some(acc)
}

/**
 * `base ** exp` for a non-negative safe-integer `exp`, by repeated squaring
 * (`O(log exp)` calls of `mul`). @internal
 */
export const powBySquaring = <A>(one: A, mul: (x: A, y: A) => A, base: A, exp: number): A => {
  let result = one
  let b = base
  let e = exp
  while (e > 0) {
    if (e % 2 === 1) result = mul(result, b)
    e = Math.floor(e / 2)
    if (e > 0) b = mul(b, b)
  }
  return result
}

/** The operations Euclid's algorithm needs from an integral type. @internal */
export interface EuclidOps<A> {
  readonly isZero: (a: A) => boolean
  readonly rem: (a: A, b: A) => A
}

/** Euclid's algorithm over `x, y` (callers pass absolute values). @internal */
export const euclid = <A>(I: EuclidOps<A>, a: A, b: A): A => {
  let x = a
  let y = b
  while (!I.isZero(y)) {
    const r = I.rem(x, y)
    x = y
    y = r
  }
  return x
}

/** The operations the extended Euclidean algorithm needs. @internal */
export interface ExtendedEuclidOps<A> {
  readonly zero: A
  readonly one: A
  readonly isZero: (a: A) => boolean
  readonly div: (a: A, b: A) => A
  readonly sub: (a: A, b: A) => A
  readonly mul: (a: A, b: A) => A
}

/**
 * The extended Euclidean algorithm before sign normalisation: the last
 * non-zero remainder and its Bézout coefficients. @internal
 */
export const extendedEuclid = <A>(I: ExtendedEuclidOps<A>, a: A, b: A): readonly [r: A, s: A, t: A] => {
  let [oldR, r] = [a, b]
  let [oldS, s] = [I.one, I.zero]
  let [oldT, t] = [I.zero, I.one]
  while (!I.isZero(r)) {
    const q = I.div(oldR, r)
    ;[oldR, r] = [r, I.sub(oldR, I.mul(q, r))]
    ;[oldS, s] = [s, I.sub(oldS, I.mul(q, s))]
    ;[oldT, t] = [t, I.sub(oldT, I.mul(q, t))]
  }
  return [oldR, oldS, oldT]
}
