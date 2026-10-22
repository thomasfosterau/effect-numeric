import * as Option from "effect/Option"
import * as Result from "effect/Result"
import { assert } from "vite-plus/test"

/** The value of a `Some`, failing the test (rather than throwing an opaque error) on `None`. */
export const getSome = <A>(self: Option.Option<A>): A => {
  assert(Option.isSome(self), "expected Some, got None")
  return self.value
}

/** The success of a `Result`, failing the test on a `Failure`. */
export const getSuccess = <A, E>(self: Result.Result<A, E>): A => {
  assert(Result.isSuccess(self), "expected a Success, got a Failure")
  return self.success
}

/** The failure of a `Result`, failing the test on a `Success`. */
export const getFailure = <A, E>(self: Result.Result<A, E>): E => {
  assert(Result.isFailure(self), "expected a Failure, got a Success")
  return self.failure
}
