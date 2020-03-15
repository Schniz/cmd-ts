export type Right<R> = { type: 'ok'; value: R };
export type Left<L> = { type: 'error'; error: L };
export type Either<L, R> = Left<L> | Right<R>;

export function ok<R>(value: R): Right<R> {
  return { type: 'ok', value };
}

export function err<L>(error: L): Left<L> {
  return { type: 'error', error };
}

export function isRight<R>(either: Either<any, R>): either is Right<R> {
  return either.type === 'ok';
}

export function isLeft<L>(either: Either<L, any>): either is Left<L> {
  return either.type === 'error';
}

export async function safeAsync<R>(
  promise: Promise<R>
): Promise<Either<Error, R>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (e) {
    return err(e);
  }
}
