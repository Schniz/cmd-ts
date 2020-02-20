import * as t from 'io-ts';

/**
 * A type that turns a string into a boolean
 */
export const BooleanFromString = new t.Type<boolean, string, unknown>(
  'boolean',
  (x): x is boolean => typeof x === 'boolean',
  (obj, ctx) => {
    if (obj === 'true') return t.success(true);
    if (obj === 'false') return t.success(false);
    return t.failure(obj, ctx, 'Provided value is not a boolean');
  },
  x => (x ? 'true' : 'false')
);
