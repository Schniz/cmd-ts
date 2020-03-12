import { Type, fromFn, typeDef } from './type';
import { OutputOf, InputOf, FromFn, From } from './from';

type Any<A = any> = FromFn<A, any> | From<A, any>;

/**
 * Take one of the types. Merge the metadata from left to right.
 * If nothing matches, prints all the errors.
 */
export function union<T1 extends Any, T2s extends Any<InputOf<T1>>>(
  ts: [T1, ...T2s[]],
): Type<InputOf<T1>, OutputOf<T1 | T2s>> {
  const merged = Object.assign({}, ...ts.map(x => typeDef(x)));
  return {
    ...merged,
    async from(input) {
      const errors: string[] = [];

      for (const t of ts) {
        const decoded = await fromFn(t)(input);
        if (decoded.result === 'ok') {
          return decoded;
        }
        errors.push(decoded.message);
      }

      return { result: 'error', message: errors.join('\n') };
    },
  };
}
