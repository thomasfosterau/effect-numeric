# effect-numeric

[![CI](https://github.com/thomasfosterau/effect-numeric/actions/workflows/ci.yml/badge.svg)](https://github.com/thomasfosterau/effect-numeric/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/effect-numeric)](https://www.npmjs.com/package/effect-numeric)

Numeric types for [Effect](https://effect.website), modelled on Rust's [`num`](https://github.com/rust-num/num) family of crates and its primitive integer types:

- **Fixed-width integers** `I8` … `I128`, `U8` … `U128` (and any width you define) with strict, checked, wrapping, saturating and overflowing arithmetic.
- **`Wrapping` / `Saturating` / `Checked` / `Overflowing`** instances: Rust's `Wrapping<T>` and `Saturating<T>` as type class instances.
- **Clamped types**: numbers constrained to `[min, max]` at the type level, with saturating arithmetic, wrapping, interpolation and rescaling.
- **Floats**: a `Float` type class, `F64`, single precision `F32`, IEEE 754 total ordering, and the `NotNaN` / `Finite` refinements.
- **`Ratio`**: exact arbitrary precision rationals.
- **`Complex`**: complex numbers over doubles.
- **Type classes** in the style of `num-traits` (`Num`, `Integral`, `Signed`, `Bounded`, `Fractional`, `CheckedOps`, `WrappingOps`, …), plus generic algorithms from `num-integer` and `num-iter`.

Everything is Effect-native: values are `Brand`ed, failures are tagged `Data.TaggedError`s carried in `Result` / `Option`, every type ships a `Schema`, `Order` and `Equivalence`, value objects implement `Equal` / `Hash`, and all binary functions are dual (data-first or `pipe`-able).

## Installation

```sh
pnpm add effect-numeric effect
```

`effect` (v4) is a peer dependency. The package is ESM-only.

## Fixed-width integers

```ts
import { Effect, Option, pipe } from "effect"
import { I8, U8, U64 } from "effect-numeric"

const a = U8.make(200) // U8 (throws OutOfRangeError if out of range)
const b = U8.make(100)

U8.add(a, b) // Result.fail(OverflowError) — strict
U8.checkedAdd(a, b) // Option.none()
U8.wrappingAdd(a, b) // 44
U8.saturatingAdd(a, b) // 255
U8.overflowingAdd(a, b) // [44, true]

pipe(a, U8.saturatingSub(b)) // 100 — every binary op is dual

U8.from(256) // Option.none() — Rust's TryFrom
U8.wrappingFrom(-1) // 255 — Rust's `as` between integers
U8.saturatingFrom(1e9) // 255 — Rust's `as` from a float

I8.checkedDiv(I8.MIN, I8.make(-1)) // Option.none()
I8.remEuclid(I8.make(-7), I8.make(3)) // Result.succeed(2)

U64.wrappingMul(U64.MAX, U64.MAX) // 1n
```

Strict operations return a `Result`, which lifts straight into an `Effect` with typed, tagged errors:

```ts
const program = Effect.gen(function* () {
  const total = yield* Effect.fromResult(U8.add(a, b))
  return total
}).pipe(Effect.catchTag("OverflowError", (e) => Effect.succeed(U8.MAX)))
```

| Prefix        | On overflow / invalid input    | Returns                      |
| ------------- | ------------------------------ | ---------------------------- |
| _(none)_      | fails with a tagged error      | `Result<A, ArithmeticError>` |
| `checked`     | returns `None`                 | `Option<A>`                  |
| `wrapping`    | wraps modulo 2^bits            | `A`                          |
| `saturating`  | clamps to `MIN` / `MAX`        | `A`                          |
| `overflowing` | wraps and reports the overflow | `readonly [A, boolean]`      |

Each module also provides `pow`, shifts, `divEuclid` / `remEuclid`, `abs`, `signum`, `isqrt`, `ilog2` / `ilog10` / `ilog`, `midpoint`, `absDiff`, `isPowerOfTwo`, `checkedNextPowerOfTwo`, bit operations (`countOnes`, `leadingZeros`, `trailingZeros`, `rotateLeft`, `reverseBits`, `swapBytes`, …), byte conversions (`toBeBytes`, `fromLeBytes`, …), `parse` / `toString` in any radix, ranges, `Order`, `Equivalence`, and two schemas:

```ts
import { Schema } from "effect"

Schema.decodeUnknownSync(U8.schema)(42) // 42 as U8
Schema.decodeUnknownSync(U64.schemaFromString)("18446744073709551615") // U64.MAX
```

Types of up to 32 bits are represented by `number`, wider types by `bigint`.

### Custom widths

```ts
import type { Brand } from "effect"
import { FixedInt } from "effect-numeric"

type U4 = number & Brand.Brand<"U4">
const U4 = FixedInt.make<U4>({ name: "U4", bits: 4, signed: false })

type I256 = bigint & Brand.Brand<"I256">
const I256 = FixedInt.makeBig<I256>({ name: "I256", bits: 256, signed: true })
```

## Wrapping, Saturating, Checked, Overflowing

Rust's `Wrapping<T>` and `Saturating<T>` change what `+` means for a type. Here they are type class instances you pick once and then use everywhere — including in generic algorithms:

```ts
import { Checked, I8, I64, Integer, Num, Overflowing, Saturating, U8, Wrapping } from "effect-numeric"

const W = Wrapping.U8 // Integral<U8> & Signed<U8> & Bounded<U8>
W.add(U8.make(250), U8.make(10)) // 4
Num.sum(Wrapping.U8)([U8.make(200), U8.make(100)]) // 44

Saturating.I8.mul(I8.make(-100), I8.make(2)) // -128
Checked.U8.sum([U8.make(100), U8.make(200)]) // Option.none()
Overflowing.U8.add(U8.MAX, U8.one) // [0, true]

Integer.gcd(Wrapping.I64)(I64.make(-12n), I64.make(18n)) // 6n
```

## Clamped types

```ts
import { Clamped } from "effect-numeric"

const Volume = Clamped.int({ min: 0, max: 11 })
type Volume = Clamped.ValueOf<typeof Volume> // ClampedInt<0, 11>

Volume.make(42) // 11 — clamps
Volume.from(42) // Option.none() — validates
Volume.add(Volume.make(10), 5) // 11 — saturating arithmetic

const Hue = Clamped.make({ min: 0, max: 360 })
Hue.wrap(370) // 10
Hue.rescale(Clamped.Percentage)(Hue.make(90)) // 25

Clamped.UnitInterval.make(1.5) // 1
```

Bounds are tracked in the type, so a `Clamped<0, 1>` can't be passed where a `Clamped<0, 100>` is expected. Each clamped type has a strict `schema` and a lenient `schemaClamping`.

## Floats

```ts
import { Array } from "effect"
import { F32, Float } from "effect-numeric"

Array.sort([3, NaN, -0, 0, -1], Float.F64.Order) // [-1, -0, 0, 3, NaN] — IEEE totalOrder
Float.F64.roundTiesEven(2.5) // 2
Float.F64.nextUp(1) // 1.0000000000000002

F32.add(F32.from(0.1), F32.from(0.2)) // single precision arithmetic

Float.Finite.mul(Float.Finite(1e300), Float.Finite(1e300)) // Option.none()
Float.NotNaN.option(NaN) // Option.none()
```

## Ratio and Complex

```ts
import { Equal, pipe } from "effect"
import { Complex, Ratio } from "effect-numeric"

const third = Ratio.make(1, 3)
pipe(third, Ratio.add(Ratio.make(1, 6)), Ratio.toString) // "1/2"
Equal.equals(Ratio.make(2, 4), Ratio.make(1, 2)) // true
Ratio.approximate(Math.PI, 1000n) // Option.some(355/113)
Ratio.fromNumber(0.1) // Option.some(3602879701896397/36028797018963968), the double's exact value
Ratio.toFixed(Ratio.make(2, 3), 4) // "0.6667"

const z = Complex.make(3, 4)
Complex.abs(z) // 5
Complex.toString(Complex.mul(z, Complex.i)) // "-4+3i"
```

## Type classes and generic code

| Type class                   | Rust equivalent                       |
| ---------------------------- | ------------------------------------- |
| `Zero`, `One`, `Bounded`     | `num_traits::{Zero, One, Bounded}`    |
| `Num`, `OrderedNum`          | `num_traits::Num`                     |
| `Signed`                     | `num_traits::Signed`                  |
| `Integral`                   | `num_integer::Integer`                |
| `Fractional`                 | field operations                      |
| `Float.Float`                | `num_traits::Float`                   |
| `Checked.CheckedOps`         | `CheckedAdd`, `CheckedMul`, …         |
| `Wrapping.WrappingOps`       | `WrappingAdd`, `WrappingMul`, …       |
| `Saturating.SaturatingOps`   | `SaturatingAdd`, `SaturatingMul`, …   |
| `Overflowing.OverflowingOps` | `OverflowingAdd`, `OverflowingMul`, … |

Instances: `Num.number`, `Num.bigint`, `Wrapping.*`, `Saturating.*`, `Float.F64`, `F32`, `Ratio.Field`, `Complex.Field`. Every `FixedInt` module implements the `*Ops` type classes directly.

```ts
import { Integer, Num, Range, Ratio } from "effect-numeric"

const mean =
  <A>(N: Num.Fractional<A>, fromCount: (n: number) => A) =>
  (xs: ReadonlyArray<A>) =>
    N.div(Num.sum(N)(xs), fromCount(xs.length))

mean(Ratio.Field, Ratio.fromInteger)([Ratio.make(1), Ratio.make(2)]) // 3/2

Integer.extendedGcd(Num.bigint)(240n, 46n) // { gcd: 2n, x: -9n, y: 47n }
Integer.divFloor(Num.bigint)(-7n, 2n) // -4n
Integer.isPrime(2n ** 61n - 1n) // true
Integer.modPow(4n, 13n, 497n) // 445n

Array.from(Range.rangeStep(Num.bigint)(10n, 0n, -3n)) // [10n, 7n, 4n, 1n]
```

Type class instances are total: where an operation is undefined (integer division by zero), instances throw a `DivisionByZeroError`, mirroring a Rust panic. Use the `Result` / `Option` returning functions on the concrete modules to handle those cases as values.

## Modules

Every module is available from the package root and as a subpath import (`effect-numeric/U8`, `effect-numeric/Ratio`, …).

| Module            | Contents                                                                               |
| ----------------- | -------------------------------------------------------------------------------------- |
| `I8` … `U128`     | standard fixed-width integers                                                          |
| `FixedInt`        | the `FixedInt` model and `make` / `makeBig` for custom widths                          |
| `Wrapping`        | `WrappingOps`, `WrappingInt`, instances for standard types                             |
| `Saturating`      | `SaturatingOps`, `SaturatingInt`, instances for standard types                         |
| `Checked`         | `CheckedOps`, `Checked`, instances, `sum` / `product`                                  |
| `Overflowing`     | `OverflowingOps`, `Overflowing`, instances, `sum`                                      |
| `Clamped`         | `make`, `int`, `UnitInterval`, `SignedUnitInterval`, `Percentage`                      |
| `Float`           | `Float` type class, `F64`, `totalOrder`, `NotNaN`, `Finite`                            |
| `F32`             | single precision floats                                                                |
| `Ratio`           | rationals over `bigint`                                                                |
| `Complex`         | complex numbers over `number`                                                          |
| `Num`             | core type classes, generic `sum` / `product` / `pow`, instances                        |
| `Integer`         | `gcd`, `lcm`, floored division, roots, `binomial`, `modPow`, `isPrime`, …              |
| `Range`           | `range`, `rangeInclusive`, `rangeStep`, `linspace`                                     |
| `ArithmeticError` | `OverflowError`, `DivisionByZeroError`, `DomainError`, `OutOfRangeError`, `ParseError` |

## Links

- [API surface by module](#modules): every export carries a doc comment with `@since` and, for constructors, an `@example`.
- [CHANGELOG.md](https://github.com/thomasfosterau/effect-numeric/blob/main/CHANGELOG.md): release notes, written by changesets.
- [CONTRIBUTING.md](https://github.com/thomasfosterau/effect-numeric/blob/main/CONTRIBUTING.md): development setup and checks.
- [SECURITY.md](https://github.com/thomasfosterau/effect-numeric/blob/main/SECURITY.md): reporting a vulnerability.

## License

MIT
