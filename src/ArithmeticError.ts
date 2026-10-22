/**
 * Typed errors produced by fallible numeric operations.
 *
 * Every error is a `Schema.TaggedError`, so it can be matched on by `_tag`,
 * yielded directly inside `Effect.gen`, compared structurally, and used as a
 * schema of its own. Each `message` is derived from the error's fields.
 *
 * @since 0.1.0
 */
import * as Schema from "effect/Schema"

/** Quotes a string exactly as `JSON.stringify` does, for {@link ParseError}'s message. */
const quote = Schema.encodeSync(Schema.fromJsonString(Schema.String))

/**
 * The result of an operation does not fit in the target type.
 *
 * @category errors
 * @since 0.1.0
 */
export class OverflowError extends Schema.TaggedError<OverflowError>()("OverflowError", {
  /** Name of the operation that overflowed, e.g. `"add"`. */
  operation: Schema.String,
  /** Name of the numeric type, e.g. `"U8"`. */
  type: Schema.String
}) {
  /** `"<type>: attempt to <operation> with overflow"`. */
  override get message(): string {
    return `${this.type}: attempt to ${this.operation} with overflow`
  }
}

/**
 * An attempt was made to divide by zero.
 *
 * @category errors
 * @since 0.1.0
 */
export class DivisionByZeroError extends Schema.TaggedError<DivisionByZeroError>()("DivisionByZeroError", {
  /** Name of the operation, e.g. `"div"`. */
  operation: Schema.String,
  /** Name of the numeric type, e.g. `"U8"`. */
  type: Schema.String
}) {
  /** `"<type>: attempt to <operation> by zero"`. */
  override get message(): string {
    return `${this.type}: attempt to ${this.operation} by zero`
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
export class OutOfRangeError extends Schema.TaggedError<OutOfRangeError>()("OutOfRangeError", {
  /** Name of the target type, e.g. `"U8"`. */
  type: Schema.String,
  /** The rejected input. */
  value: Schema.Unknown,
  /** The smallest value of the target type. */
  min: Schema.Unknown,
  /** The largest value of the target type. */
  max: Schema.Unknown
}) {
  /** `"<type>: <value> is not a valid value in range [<min>, <max>]"`. */
  override get message(): string {
    return `${this.type}: ${String(this.value)} is not a valid value in range [${String(this.min)}, ${String(this.max)}]`
  }
}

/**
 * An operation was applied to an argument outside of its mathematical domain,
 * for example the square root or logarithm of a negative number.
 *
 * @category errors
 * @since 0.1.0
 */
export class DomainError extends Schema.TaggedError<DomainError>()("DomainError", {
  /** Name of the operation, e.g. `"isqrt"`. */
  operation: Schema.String,
  /** Name of the numeric type, e.g. `"I8"`. */
  type: Schema.String,
  /** Why the argument is outside the domain. */
  reason: Schema.String
}) {
  /** `"<type>: <operation>: <reason>"`. */
  override get message(): string {
    return `${this.type}: ${this.operation}: ${this.reason}`
  }
}

/**
 * A string could not be parsed as a number of the target type.
 *
 * @category errors
 * @since 0.1.0
 */
export class ParseError extends Schema.TaggedError<ParseError>()("ParseError", {
  /** Name of the target type, e.g. `"U8"`. */
  type: Schema.String,
  /** The string that failed to parse. */
  input: Schema.String
}) {
  /** `"<type>: cannot parse <input as a JSON string literal>"`. */
  override get message(): string {
    return `${this.type}: cannot parse ${quote(this.input)}`
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
