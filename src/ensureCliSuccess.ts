import chalk from 'chalk';
import { Either, Right } from 'fp-ts/lib/Either';
import kebabCase from 'lodash.kebabcase';
import stripAnsi from 'strip-ansi';
import { INTERNAL_CLI_ARGS_NAME, padEndNoAnsi } from './utils';
import { ParseError } from './Parser';

export function ensureCliSuccess<T>(
  result: Either<ParseError, T>
): asserts result is Right<T> {
  if (result._tag === 'Right') return;

  const { context, validationErrors, parsed } = result.left;

  const missingKeys: string[] = [];
  const errorMessages: Record<string, string> = {};
  for (const error of validationErrors) {
    const errs = error.context.filter(
      x => x.type.name !== INTERNAL_CLI_ARGS_NAME
    );
    const key = errs[0].key;
    const message = error.message ?? 'No message provided.';
    const errorKey = errs[1]?.key ?? 0;
    errorMessages[key + '#' + errorKey] = message;
    if (errs[0].actual === undefined) {
      missingKeys.push(key);
    }
  }

  const colors = [
    chalk.green,
    chalk.cyan,
    chalk.yellow,
    chalk.magenta,
    chalk.blue,
  ];

  const formattedParsed: [string, string][] = [];
  let getColor = (() => {
    let i = 0;
    return () => colors[i++ % colors.length];
  })();

  for (const contextValue of context.items) {
    const color = getColor();
    formattedParsed.push([
      color(contextValue.inputValue),
      chalk.dim(contextValue.type),
    ]);
  }

  for (const index in parsed.positional) {
    const positional = parsed.positional[index];
    const errorMessage = errorMessages['#' + index];
    const color = errorMessage ? chalk.red : getColor();
    const formattedErrorMessage = errorMessage
      ? chalk.red(`${errorMessage} `)
      : '';
    formattedParsed.push([color(positional), formattedErrorMessage + chalk.dim('(positional)')]);
  }

  for (const [camelCased, values] of Object.entries(parsed.named)) {
    const isUsed = context.relevantNamedArguments.has(camelCased);
    const color = isUsed ? getColor() : chalk.dim;
    const key = `--${kebabCase(camelCased)}`;
    for (const index in values) {
      const value = values[index];
      const errorMessage = errorMessages[camelCased + '#' + index];
      const style = errorMessage ? chalk.bold.red : color;
      const styledValue = errorMessage ? chalk.underline(value) : value;
      const formattedErrorMessage = errorMessage
        ? chalk.red(errorMessage)
        : !isUsed
        ? color('unused')
        : '';
      formattedParsed.push([
        style(chalk.italic(key) + ' ' + styledValue),
        formattedErrorMessage,
      ]);
    }
  }

  for (const missingKey of missingKeys) {
    const key = `--${kebabCase(missingKey)}`;
    formattedParsed.push([
      chalk.red.italic.bold(key),
      chalk.red.italic('no value provided'),
    ]);
  }

  const maxWidthForFirstPart = formattedParsed.reduce(
    (acc, curr) => Math.max(acc, stripAnsi(curr[0]).length),
    0
  );
  const maxWidthForIndex = String(formattedParsed.length + 1).length;

  console.error(chalk.red(`Provided arguments don't match!`));
  console.error(
    formattedParsed
      .map(x => `${padEndNoAnsi(x[0], maxWidthForFirstPart)} ${x[1]}`.trim())
      .map((x, i) => {
        const index = String(i + 1).padStart(maxWidthForIndex);
        return `  ${chalk.dim(index + '.')} ${x}`;
      })
      .join('\n')
  );

  process.exit(1);
}
