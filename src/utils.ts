import stripAnsi from 'strip-ansi';

/**
 * Throws an error with an `unimplemented` message
 */
export function unimplemented(): never {
  throw new Error('unimplemented');
}

export function padNoAnsi(str: string, length: number, place: 'end' | 'start') {
  const noAnsiStr = stripAnsi(str);
  if (length < noAnsiStr.length) return str;
  const pad = Array(length - noAnsiStr.length + 1).join(' ');
  if (place === 'end') {
    return str + pad;
  } else {
    return pad + str;
  }
}
