import * as t from 'io-ts';

export const BoolOfStr = new t.Type<boolean, string, unknown>(
  'integer',
  (x: unknown): x is boolean => typeof x === 'boolean',
  (obj, ctx) => {
    if (obj === 'true') return t.success(true);
    if (obj === 'false') return t.success(false);
    return t.failure(obj, ctx, `This is neither 'true' or 'false'`);
  },
  x => String(x)
);
