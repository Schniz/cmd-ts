export type Ok<R> = { _tag: 'ok'; value: R };
export type Err<L> = { _tag: 'error'; error: L };
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
 * Checks whether a value is a Left.
 * Handy with TypeScript guards
 */
export function isLeft<L>(either: Result<L, any>): either is Err<L> {
  return either._tag === 'error';
}

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
