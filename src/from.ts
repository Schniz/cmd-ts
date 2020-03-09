export type DecodeResult<T> =
  | { result: 'ok'; value: T }
  | { result: 'error'; message: string };
export type From<A, B> = {
  from(value: A): DecodeResult<B>;
};
export type FromString<T> = From<string, T>;
export type FromStringArray<T> = From<string[], T>;
export type OutputOf<F extends From<any, any>> = F extends From<
  any,
  infer Output
>
  ? Output
  : never;
export type InputOf<F extends From<any, any>> = F extends From<infer Input, any>
  ? Input
  : never;

export function from<F extends From<any, any>>(f: F): F {
  return f;
}

export function identity<T>(): From<T, T> {
  return {
    from(a) {
      return { result: 'ok', value: a };
    },
  };
}
