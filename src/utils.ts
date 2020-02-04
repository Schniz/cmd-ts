import stripAnsi from 'strip-ansi';

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
