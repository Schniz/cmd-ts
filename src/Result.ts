/**
 * A successful value
 */
export type Ok<R> = { _tag: 'ok'; value: R };

/**
 * A failed value
 */
export type Err<L> = { _tag: 'error'; error: L };

/**
 * A safe result type: imagine a language with no exceptions — the way to handle
 * errors would be to use something like a tagged union type.
 *
 * Why would we want that? I want to explicitly handle exceptions in this library
 * and having this construct really helps. It's also pretty easy to implement.
 */
export type Result<L, R> = Err<L> | Ok<R>;

export function ok<O>(value: O): Ok<O> {
  return { _tag: 'ok', value };
}

export function err<E>(error: E): Err<E> {
  return { _tag: 'error', error };
}

/**
 * Checks whether a value is an `Ok`.
 * Handy with TypeScript guards
 */
export function isOk<R>(result: Result<any, R>): result is Ok<R> {
  return result._tag === 'ok';
}

/**
 * Checks whether a value is an `Err`.
 * Handy with TypeScript guards
 */
export function isErr<L>(either: Result<L, any>): either is Err<L> {
  return either._tag === 'error';
}

/**
 * Convert a `Promise<T>` into a `Promise<Result<Error, T>>`,
 * therefore catching the errors and being able to handle them explicitly
 */
export async function safeAsync<O>(
  promise: Promise<O>
): Promise<Result<Error, O>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(e);
  }
}
