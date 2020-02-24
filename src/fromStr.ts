import { either } from 'fp-ts/lib/Either';
import { unimplemented } from './utils';
import * as t from 'io-ts';
import { withMessage } from 'io-ts-types/lib/withMessage';

/** A string */
export const string = withMessage(
  t.string,
  () => `Provided value is not a string`
);

/**
 * Create a new type from string
 *
 * This is a handy utility to create a new `t.Type` without providing
 * details that aren't necessary for the two-way conversions: `clio-ts`
 * is only using a `string => T` conversion, while `io-ts` supports two sided
 * conversions: `string <=> T`. This is unnecessary and adds complexity, so this
 * tiny handler helps with providing defaults and `unimplemented` calls when necessary.
 */
export function fromStr<Output = unknown>(
  validator: t.Validate<string, Output>
): t.Type<Output, string> {
  return new t.Type<Output, string>(
    'CustomValidator',
    (_x): _x is Output => false,
    (obj, ctx) => {
      return either.chain(string.validate(obj, ctx), s => validator(s, ctx));
    },
    unimplemented
  );
}
