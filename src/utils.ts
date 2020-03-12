import chalk from 'chalk';
import stripAnsi from 'strip-ansi';

/**
 * @ignore
 */
export function padNoAnsi(
  str: string,
  length: number,
  place: 'end' | 'start'
): string {
  const noAnsiStr = stripAnsi(str);
  if (length < noAnsiStr.length) return str;
  const pad = Array(length - noAnsiStr.length + 1).join(' ');
  if (place === 'end') {
    return str + pad;
  } else {
    return pad + str;
  }
}

const colorCycle = [
  chalk.green,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.white,
];

/**
 * Creates a function to get a new color
 *
 * @ignore
 */
export function generateColorCycle(): () => chalk.Chalk {
  let i = 0;
  return () => colorCycle[i++ % colorCycle.length];
}

/**
 * Group an array by a function that returns the key
 *
 * @ignore
 */
export function groupBy<A, B extends string>(
  objs: A[],
  f: (a: A) => B
): Record<B, A[]> {
  const result = {} as Record<B, A[]>;
  for (const obj of objs) {
    const key = f(obj);
    result[key] = result[key] ?? [];
    result[key].push(obj);
  }
  return result;
}

/**
 * A better typed version of `Object.entries`
 *
 * @ignore
 */
export function entries<Obj extends Record<string, any>>(
  obj: Obj
): { [key in keyof Obj]: [key, Obj[key]] }[keyof Obj][] {
  return Object.entries(obj);
}

/**
 * Enumerate over a list, to get a pair of [index, value]
 *
 * @ignore
 */
export function* enumerate<T>(arr: T[]): Generator<[number, T]> {
  for (let i = 0; i < arr.length; i++) {
    yield [i, arr[i]];
  }
}

/**
 * Array#flatMap polyfill
 *
 * @ignore
 */
export function flatMap<A, B>(xs: A[], fn: (a: A) => B[]): B[] {
  const results: B[] = [];
  for (const x of xs) {
    results.push(...fn(x));
  }
  return results;
}

/**
 * Either the provided `T` or an empty object
 */
export type AllOrNothing<T> = T | { [key in keyof T]?: never };
