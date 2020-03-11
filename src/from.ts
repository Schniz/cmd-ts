export type DecodeResult<T> =
  | { result: 'ok'; value: T }
  | { result: 'error'; message: string };
export type From<A, B> = {
  /**
   * Convert `input` safely and asynchronously into an output.
   */
  from(input: A): Promise<DecodeResult<B>>;
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
    async from(a) {
      return { result: 'ok', value: a };
    },
  };
}
