/* istanbul ignore file */

import { Stream } from 'stream';
import { stat, pathExists, createReadStream } from 'fs-extra';
import fetch from 'node-fetch';
import URL from 'url';
import { Type, extendType, number } from '../src';

export const Integer: Type<string, number> = extendType(number, {
  async from(n) {
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
  async from(obj) {
    if (typeof obj !== 'string') {
      return {
        result: 'error',
        message: `Something other than string provided`,
      };
    }

    const parsedUrl = URL.parse(obj);

    if (parsedUrl.protocol?.startsWith('http')) {
      const response = await fetch(obj);
      const statusGroup = Math.floor(response.status / 100);
      if (statusGroup !== 2) {
        return {
          result: 'error',
          message: `Got status ${response.statusText} ${response.status} reading URL`,
        };
      }
      return { result: 'ok', value: response.body };
    }

    if (obj === '-') {
      return { result: 'ok', value: stdin() };
    }

    if (!(await pathExists(obj))) {
      return { result: 'error', message: `Can't find file in path ${obj}` };
    }

    const fileStat = await stat(obj);
    if (!fileStat.isFile()) {
      return { result: 'error', message: `Path is not a file.` };
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
  async from(s) {
    return { result: 'ok', value: s.split(/, ?/) };
  },
};
