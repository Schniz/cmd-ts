import { Type, fromFn, typeDef } from './type';
import { OutputOf, InputOf, FromFn, From } from './from';
import * as Result from './Result';

type Any<A = any> = FromFn<A, any> | From<A, any>;

/**
 * Take one of the types. Merge the metadata from left to right.
 * If nothing matches, prints all the errors.
 */
export function union<T1 extends Any, T2s extends Any<InputOf<T1>>>(
  ts: [T1, ...T2s[]],
  {
    combineErrors = errors => errors.join('\n'),
  }: {
    /**
     * Combine all the errors produced by the types.
     * Defaults to joining them with a newline.
     */
    combineErrors?(errors: string[]): string;
  } = {}
): Type<InputOf<T1>, OutputOf<T1 | T2s>> {
  const merged = Object.assign({}, ...ts.map(x => typeDef(x)));
  return {
    ...merged,
    async from(input) {
      const errors: string[] = [];

      for (const t of ts) {
        const decoded = await Result.safeAsync(fromFn(t)(input));
        if (Result.isOk(decoded)) {
          return decoded.value;
        }
        errors.push(decoded.error.message);
      }

      throw new Error(combineErrors(errors));
    },
  };
}
