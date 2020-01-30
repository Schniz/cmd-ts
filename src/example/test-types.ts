import * as t from 'io-ts';
import { Stream } from 'stream';
import { existsSync, createReadStream } from 'fs';
import request from 'request';
import URL from 'url';
import { Either, either, Right } from 'fp-ts/lib/Either';

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

export const IntOfStr = new t.Type<number, string, unknown>(
  'integer',
  (x: unknown): x is number => {
    return typeof x === 'number' && Math.round(x) === x;
  },
  (obj, ctx) => {
    if (typeof obj !== 'string') {
      return t.failure(obj, ctx, `Something other than string provided`);
    }

    const asInt = parseInt(obj, 10);
    if (Number.isNaN(asInt)) {
      return t.failure(obj, ctx, `The string provided is not a number`);
    }

    if (asInt !== parseFloat(obj)) {
      return t.failure(obj, ctx, `The string provided is a float`);
    }
    return t.success(asInt);
  },
  obj => String(obj)
);

function stdin() {
  return (global as any).mockStdin || process.stdin;
}

export const ReadStream = new t.Type<Stream, string, unknown>(
  'read stream',
  (x: unknown): x is Stream => {
    return x && typeof (x as any).pipe === 'function';
  },
  (obj, ctx) => {
    if (typeof obj !== 'string') {
      return t.failure(obj, ctx, `Something other than string provided`);
    }

    const parsedUrl = URL.parse(obj);

    if (parsedUrl.protocol?.startsWith('http')) {
      return t.success(request(obj));
    }

    if (obj === '-') {
      return t.success(stdin());
    }

    if (!existsSync(obj)) {
      return t.failure(obj, ctx, `Can't find file in path ${obj}`);
    }

    return t.success(createReadStream(obj));
  },
  _obj => {
    throw new Error("Can't unparse it");
  }
);

export function ensureRight<T>(e: Either<any, T>): asserts e is Right<T> {
  if (e._tag === 'Left') {
    throw new Error(e.left);
  }
}

export function readStreamToString(s: Stream): Promise<string> {
  return new Promise((resolve, reject) => {
    let str = '';
    s.on('data', x => (str += x.toString()));
    s.on('error', e => reject(e));
    s.on('end', () => resolve(str));
  });
}

export const CommaSeparatedString = new t.Type<string[], string, unknown>(
  'comma separated string',
  (x): x is string[] => t.array(t.string).is(x),
  (obj, ctx) => {
    if (typeof obj !== 'string') {
      return t.failure(obj, ctx, 'provided value is not a string');
    }
    return t.success(obj.split(','));
  },
  x => x.join(',')
);

export function commaSeparated<T extends t.Type<any, string, unknown>>(
  decoder: T
): t.Type<t.TypeOf<T>[], string, unknown> {
  const decoderArray = t.array(decoder);
  return new t.Type<T[], string, unknown>(
    `comma separated ${decoder.name}`,
    (x): x is T[] => decoderArray.is(x),
    (obj, ctx) => {
      if (typeof obj !== 'string') {
        return t.failure(obj, ctx, 'provided value is not a string');
      }
      const validated = decoderArray.validate(obj.split(','), ctx);
      return validated;
    },
    x => x.join(',')
  );
}

export function commaSeparatedArr<T extends t.Type<any, string, unknown>>(
  decoder: T
): t.Type<T[], string[], unknown> {
  const decoderArray = t.array(decoder);
  const commasep = commaSeparated(decoder);
  return new t.Type<T[], string[], unknown>(
    `comma separated ${decoder.name}`,
    (x): x is T[] => decoderArray.is(x),
    (obj, ctx) => {
      if (!Array.isArray(obj)) {
        return t.failure(obj, ctx, 'provided value is not a array');
      }
      return either.map(t.array(commasep).validate(obj, ctx), x => x.flat());
    },
    _x => {
      throw new Error("Hadhasd");
    }
  );
}

export function flattened<T extends t.Type<any[], string, unknown>>(
  decoder: T
): t.Type<t.TypeOf<T>, string[], unknown> {
  return new t.Type<t.TypeOf<T>, string[], unknown>(
    `array(${decoder.name})`,
    (x): x is t.TypeOf<T> => decoder.is(x),
    (obj, ctx) => {
      return either.map(t.array(decoder).validate(obj, ctx), x => x.flat())
    },
    _x => {
      throw new Error("unimplemented")
    }
  );
}
