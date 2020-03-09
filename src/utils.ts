import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import { ParseItem } from './argparse';

/**
 * @ignore
 */
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
 * Generates a string from the parsed context of argparse
 *
 * @ignore
 */
export function contextToString(ctx: ParseItem[]): string {
  const getColor = generateColorCycle();

  let parts: string[] = [];
  for (const item of ctx) {
    switch (item.type) {
      case 'positional': {
        parts.push(item.input);
        break;
      }
      case 'namedArgument': {
        parts.push(`${item.inputKey} ${item.inputValue}`);
        break;
      }
      case 'forcePositional': {
        parts.push('--');
        break;
      }
    }
  }
  return parts.map(x => getColor()(x)).join(' ');
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
