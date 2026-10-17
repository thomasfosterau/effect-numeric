/**
 * Typed errors produced by fallible numeric operations.
 *
 * Every error is a `Data.TaggedError`, so it can be matched on by `_tag`,
 * yielded directly inside `Effect.gen`, and compared structurally.
 *
 * @since 0.1.0
 */
import * as Data from "effect/Data"

/**
 * The result of an operation does not fit in the target type.
 *
 * @category errors
 * @since 0.1.0
 */
export class OverflowError extends Data.TaggedError("OverflowError")<{
  /** Name of the operation that overflowed, e.g. `"add"`. */
  readonly operation: string
  /** Name of the numeric type, e.g. `"U8"`. */
  readonly type: string
  readonly message: string
}> {
  constructor(args: { readonly operation: string; readonly type: string }) {
    super({ ...args, message: `${args.type}: attempt to ${args.operation} with overflow` })
  }
}

/**
 * An attempt was made to divide by zero.
 *
 * @category errors
 * @since 0.1.0
 */
export class DivisionByZeroError extends Data.TaggedError("DivisionByZeroError")<{
  readonly operation: string
  readonly type: string
  readonly message: string
}> {
  constructor(args: { readonly operation: string; readonly type: string }) {
    super({ ...args, message: `${args.type}: attempt to ${args.operation} by zero` })
  }
}

/**
 * A value could not be converted into the target type because it lies
 * outside of the representable range, or is not a valid member of the type
 * (for example a non-integer converted to an integer type).
 *
 * @category errors
 * @since 0.1.0
 */
export class OutOfRangeError extends Data.TaggedError("OutOfRangeError")<{
  readonly type: string
  readonly value: unknown
  readonly min: unknown
  readonly max: unknown
  readonly message: string
}> {
  constructor(args: { readonly type: string; readonly value: unknown; readonly min: unknown; readonly max: unknown }) {
    super({
      ...args,
      message: `${args.type}: ${String(args.value)} is not a valid value in range [${String(args.min)}, ${String(args.max)}]`
    })
  }
}

/**
 * An operation was applied to an argument outside of its mathematical domain,
 * for example the square root or logarithm of a negative number.
 *
 * @category errors
 * @since 0.1.0
 */
export class DomainError extends Data.TaggedError("DomainError")<{
  readonly operation: string
  readonly type: string
  readonly reason: string
  readonly message: string
}> {
  constructor(args: { readonly operation: string; readonly type: string; readonly reason: string }) {
    super({ ...args, message: `${args.type}: ${args.operation}: ${args.reason}` })
  }
}

/**
 * A string could not be parsed as a number of the target type.
 *
 * @category errors
 * @since 0.1.0
 */
export class ParseError extends Data.TaggedError("ParseError")<{
  readonly type: string
  readonly input: string
  readonly message: string
}> {
  constructor(args: { readonly type: string; readonly input: string }) {
    super({ ...args, message: `${args.type}: cannot parse ${JSON.stringify(args.input)}` })
  }
}

/**
 * Union of every error produced by arithmetic operations.
 *
 * @category models
 * @since 0.1.0
 */
export type ArithmeticError = OverflowError | DivisionByZeroError | DomainError

/**
 * Returns `true` if the value is one of the errors defined in this module.
 *
 * @category guards
 * @since 0.1.0
 */
export const isArithmeticError = (u: unknown): u is ArithmeticError | OutOfRangeError | ParseError =>
  u instanceof OverflowError ||
  u instanceof DivisionByZeroError ||
  u instanceof DomainError ||
  u instanceof OutOfRangeError ||
  u instanceof ParseError
