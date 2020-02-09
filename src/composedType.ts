import * as t from 'io-ts';
import { Either, either } from 'fp-ts/lib/Either';

export type TypeRecord<A extends t.Any = t.Any> = Record<string, A>;
export type TRErrors<TR extends TypeRecord> = { [key in keyof TR]: t.Errors };
export type TROutput<TR extends TypeRecord> = {
  [key in keyof TR]: t.TypeOf<TR[key]>;
};
export type ComposedType<TR extends TypeRecord> = (
  value: unknown
) => Either<TRErrors<TR>, TROutput<TR>>;

export function emptyError<TR extends TypeRecord = TypeRecord>(
  record: TR
): TRErrors<TR> {
  const result = {} as TRErrors<TR>;

  for (const key of Object.keys(record)) {
    result[key as keyof TR] = [];
  }

  return result;
}

export function composedType<TR extends TypeRecord>(
  record: TR
): ComposedType<TR> {
  const type = t.type(record, 'SOME_TYPE');
  return value =>
    either.mapLeft(type.decode(value), allErrors => {
      const result = emptyError(record);

      for (const allError of allErrors) {
        const ctx = allError.context.slice(1);
        const error = { ...allError, context: ctx };
        result[ctx[0].key].push(error);
      }

      return result;
    });
}
