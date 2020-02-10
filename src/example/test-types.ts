/* istanbul ignore file */

import * as t from 'io-ts';
import { Stream } from 'stream';
import { existsSync, createReadStream } from 'fs';
import request from 'request';
import URL from 'url';
import { Either, either, Right } from 'fp-ts/lib/Either';
import { withMessage } from 'io-ts-types/lib/withMessage';
import { NumberFromString } from 'io-ts-types/lib/NumberFromString';
import { unimplemented } from '../utils';

const NumOfStr = withMessage(
  NumberFromString,
  () => `Provided value is not a number`
);

export const Integer = new t.Type<number, string>(
  'integer',
  (x: unknown): x is number => {
    return typeof x === 'number' && Math.round(x) === x;
  },
  (obj, ctx) => {
    return either.chain(NumOfStr.validate(obj, ctx), n => {
      if (n !== Math.round(n)) {
        return t.failure(obj, ctx, `This is a float, not an integer`);
      }
      return t.success(n);
    });
  },
  obj => String(obj)
);

function stdin() {
  return (global as any).mockStdin || process.stdin;
}

export const ReadStream = new t.Type<Stream, string>(
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
  _ => unimplemented()
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
      const splitted = obj.split(',');
      return decoderArray.validate(splitted, ctx);
      // return array.traverse(either)(splitted, x => decoder.validate(x, ctx));
    },
    x => x.join(',')
  );
}

export function flattened<T extends t.Type<any[], string, unknown>>(
  decoder: T
): t.Type<t.TypeOf<T>, string[], unknown> {
  return new t.Type<t.TypeOf<T>, string[], unknown>(
    `array(${decoder.name})`,
    (x): x is t.TypeOf<T> => decoder.is(x),
    (obj, ctx) => {
      return either.map(t.array(decoder).validate(obj, ctx), x => x.flat());
    },
    _ => unimplemented()
  );
}
