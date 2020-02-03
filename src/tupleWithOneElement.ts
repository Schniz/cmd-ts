import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

/**
 * Takes a decoder T (io-ts type) that accepts a string
 * and creates a new decoder that accepts [string] and rejects
 * if provided 0 or more than 1 element
 */
export function tupleWithOneElement<T extends t.Type<any, string>>(
  decoder: T
): t.Type<t.TypeOf<T>, [t.OutputOf<T>], unknown> {
  const tupleT = t.array(decoder);
  return new t.Type(
    decoder.name,
    function is(obj): obj is [t.TypeOf<T>] {
      return tupleT.is(obj) && obj.length === 1;
    },
    function validate(obj, context): Either<t.Errors, T['_A']> {
      if (obj === undefined) {
        return decoder.validate(obj, context);
      }

      if (!Array.isArray(obj)) {
        return t.failure(obj, context, 'Malformed data received');
      }

      if (obj.length > 1) {
        const errors = obj.slice(1).map(
          (_, i): t.ValidationError => {
            const ctx: t.Context = [
              ...context,
              {
                type: context.slice(-1)[0].type,
                key: String(i),
              },
            ];
            return {
              context: ctx,
              value: obj,
              message: `Too many arguments provided (${obj.length} for 1)`,
            };
          }
        );
        return t.failures(errors);
      }

      return decoder.validate(obj[0], context);
    },
    function encode(_val) {
      throw new Error('WERA');
    }
  );
}
