import { NodeInspectSymbol } from "effect/Inspectable"
import { pipeArguments } from "effect/Pipeable"

/**
 * Base class for numeric value objects: pipeable, with a readable
 * `toString` used by `console.log` / `util.inspect`.
 *
 * @internal
 */
export abstract class Value {
  pipe() {
    // biome-ignore lint/complexity/noArguments: pipeArguments expects IArguments
    return pipeArguments(this, arguments)
  }
  abstract toString(): string
  [NodeInspectSymbol]() {
    return this.toString()
  }
}
