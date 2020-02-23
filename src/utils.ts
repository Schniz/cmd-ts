import chalk from 'chalk';
import stripAnsi from 'strip-ansi';
import { ParseItem } from './argparse';

/**
 * Throws an error with an `unimplemented` message
 */
export function unimplemented(): never {
  throw new Error('unimplemented');
}

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
