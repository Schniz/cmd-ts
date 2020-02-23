import stripAnsi from 'strip-ansi';
import chalk from 'chalk';
import { TypeRecord } from './composedType';
import { ParseError } from './Parser';
import { contextToString, generateColorCycle, padNoAnsi } from './utils';

/**
 * Prints a parsing error nicely
 */
export function prettyPrint<TR extends TypeRecord>(
  parseError: ParseError<TR, unknown>
) {
  const getColor = generateColorCycle();
  const namedErrors = { ...parseError.errors };

  const rows: [chalk.Chalk, string, string][] = [];
  const items: string[] = [];

  for (const parseItem of parseError.parsed.context) {
    switch (parseItem.type) {
      case 'forcePositional': {
        rows.push([chalk.dim, '--', '']);
        items.push(chalk.dim('--'));
        break;
      }
      case 'positional': {
        if (parseItem.hide) {
          continue;
        }

        let color = getColor();

        if (parseItem.name) {
          const errors = namedErrors?.[parseItem.name as keyof TR];
          const arg = `<${parseItem.name}=${parseItem.input}>`;
          const mainError = errors?.[0];
          const mainErrorMessage = mainError
            ? mainError.message ?? 'No message given'
            : '';
          color = mainError ? chalk.red : color;
          rows.push([color, arg, mainErrorMessage]);
          delete namedErrors[parseItem.name];
        } else {
          rows.push([color, `<${parseItem.input}>`, '']);
        }

        items.push(color(parseItem.input));
        break;
      }
      case 'namedArgument': {
        const errors = namedErrors?.[parseItem.key as keyof TR];
        const value = parseItem.inputValue
          ? chalk.bold(parseItem.inputValue)
          : '';
        const arg = `${chalk.italic(parseItem.inputKey)} ${value}`.trim();
        const mainError = errors?.splice(0, 1)?.[0];
        const mainErrorMessage = mainError
          ? mainError.message ?? 'No message given'
          : '';
        const color = mainError ? chalk.red : getColor();
        rows.push([color, arg, mainErrorMessage]);

        const inputKey = chalk.italic(parseItem.inputKey);
        const inputValue = parseItem.inputValue ?? '';
        items.push(color(`${inputKey} ${inputValue}`.trim()));
      }
    }
  }

  for (const [name, value] of Object.entries(namedErrors)) {
    if (value.length > 0) {
      const err = value[0];
      const message =
        err.message ??
        (err.value === undefined ? 'no value provided' : 'no message provided');
      rows.push([chalk.red, chalk.italic(name), message]);
    }
  }

  console.error(chalk.red(`Can't run the requested command.`));
  console.error();
  console.error(chalk.yellow('Input:'));

  console.error('  ' + items.join(' '));
  console.error();

  console.error(chalk.yellow('Parsed:'));

  const longestA = rows.reduce(
    (a, b) => Math.max(a, stripAnsi(b[1]).length),
    0
  );

  for (const [color, a, b] of rows) {
    const aa = padNoAnsi(a, longestA + 2, 'start');
    console.error(color(`${aa}  ${b}`.trimEnd()));
  }

  const currentCmd = stripAnsi(contextToString(parseError.parsed.context));
  console.error();
  console.error(
    chalk.red(`Try running \`${currentCmd} --help\` to learn more`)
  );
}
