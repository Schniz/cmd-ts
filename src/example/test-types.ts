/* istanbul ignore file */

import { Stream } from 'stream';
import { existsSync, createReadStream } from 'fs';
import request from 'request';
import URL from 'url';
import { Type, extendType, number } from '..';

export const Integer: Type<string, number> = extendType(number, {
  from(n) {
    if (Math.round(n) !== n) {
      return { result: 'error', message: 'This is a floating-point number' };
    }
    return { result: 'ok', value: n };
  },
});

function stdin() {
  return (global as any).mockStdin || process.stdin;
}

export const ReadStream: Type<string, Stream> = {
  description: 'A file path or a URL to make a GET request to',
  displayName: 'file',
  from(obj) {
    if (typeof obj !== 'string') {
      return {
        result: 'error',
        message: `Something other than string provided`,
      };
    }

    const parsedUrl = URL.parse(obj);

    if (parsedUrl.protocol?.startsWith('http')) {
      return { result: 'ok', value: request(obj) };
    }

    if (obj === '-') {
      return { result: 'ok', value: stdin() };
    }

    if (!existsSync(obj)) {
      return { result: 'error', message: `Can't find file in path ${obj}` };
    }

    return { result: 'ok', value: createReadStream(obj) };
  },
};

export function readStreamToString(s: Stream): Promise<string> {
  return new Promise((resolve, reject) => {
    let str = '';
    s.on('data', x => (str += x.toString()));
    s.on('error', e => reject(e));
    s.on('end', () => resolve(str));
  });
}

export const CommaSeparatedString: Type<string, string[]> = {
  description: 'comma seperated string',
  from(s) {
    return { result: 'ok', value: s.split(/, ?/) };
  },
};
