/**
 * Effect-native numeric types: fixed-width integers with checked, wrapping,
 * saturating and overflowing arithmetic, clamped ranges, floats, rationals,
 * complex numbers and `num-traits` style type classes.
 *
 * @since 0.1.0
 */

/**
 * Typed errors produced by fallible numeric operations.
 *
 * @since 0.1.0
 */
export * as ArithmeticError from "./ArithmeticError.ts"

/**
 * Checked arithmetic (`Option`-returning) type class and instances.
 *
 * @since 0.1.0
 */
export * as Checked from "./Checked.ts"

/**
 * Clamped (range-bounded) numbers.
 *
 * @since 0.1.0
 */
export * as Clamped from "./Clamped.ts"

/**
 * Complex numbers over doubles.
 *
 * @since 0.1.0
 */
export * as Complex from "./Complex.ts"

/**
 * Single precision floats.
 *
 * @since 0.1.0
 */
export { F32 } from "./F32.ts"

/**
 * Fixed-width integer factory and model.
 *
 * @since 0.1.0
 */
export * as FixedInt from "./FixedInt.ts"

/**
 * The `Float` type class, `F64`, total ordering, `NotNaN` and `Finite`.
 *
 * @since 0.1.0
 */
export * as Float from "./Float.ts"

/** @since 0.1.0 */
export { I8 } from "./I8.ts"
/** @since 0.1.0 */
export { I16 } from "./I16.ts"
/** @since 0.1.0 */
export { I32 } from "./I32.ts"
/** @since 0.1.0 */
export { I64 } from "./I64.ts"
/** @since 0.1.0 */
export { I128 } from "./I128.ts"

/**
 * Integer algorithms (`num-integer`).
 *
 * @since 0.1.0
 */
export * as Integer from "./Integer.ts"

/**
 * Numeric type classes (`num-traits`).
 *
 * @since 0.1.0
 */
export * as Num from "./Num.ts"

/**
 * Overflowing arithmetic type class and instances.
 *
 * @since 0.1.0
 */
export * as Overflowing from "./Overflowing.ts"

/**
 * Numeric ranges (`num-iter`).
 *
 * @since 0.1.0
 */
export * as Range from "./Range.ts"

/**
 * Exact rational numbers.
 *
 * @since 0.1.0
 */
export * as Ratio from "./Ratio.ts"

/**
 * Saturating arithmetic type class and instances.
 *
 * @since 0.1.0
 */
export * as Saturating from "./Saturating.ts"

/** @since 0.1.0 */
export { U8 } from "./U8.ts"
/** @since 0.1.0 */
export { U16 } from "./U16.ts"
/** @since 0.1.0 */
export { U32 } from "./U32.ts"
/** @since 0.1.0 */
export { U64 } from "./U64.ts"
/** @since 0.1.0 */
export { U128 } from "./U128.ts"

/**
 * Wrapping arithmetic type class and instances.
 *
 * @since 0.1.0
 */
export * as Wrapping from "./Wrapping.ts"
