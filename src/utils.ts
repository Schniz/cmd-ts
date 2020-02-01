import stripAnsi from 'strip-ansi';
import * as t from 'io-ts';

export type FromStr<T = any> = t.Type<T, string | undefined, unknown>;
export type FromStrArray<T = any> = t.Type<T, string[] | undefined, unknown>;

export const INTERNAL_CLI_ARGS_NAME = '__clio_ts__';

export function padNoAnsi(
  str: string,
  length: number,
  place: 'end' | 'start' = 'end'
) {
  const noAnsiStr = stripAnsi(str);
  if (length < noAnsiStr.length) return str;
  const pad = Array(length - noAnsiStr.length + 1).join(' ');
  if (place === 'end') {
    return str + pad;
  } else {
    return pad + str;
  }
}
