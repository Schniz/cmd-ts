import { ParsingError } from './argparser';
import chalk from 'chalk';
import { AstNode } from './newparser/parser';
import { padNoAnsi, enumerate } from './utils';
import stripAnsi from 'strip-ansi';

type HighlightResult = { colorized: string; errorIndex: number };

/**
 * Get the input as highlighted keywords to show to the user
 * with the error that was generated from parsing the input.
 *
 * @param nodes AST nodes
 * @param error A parsing error
 */
function highlight(
  nodes: AstNode[],
  error: ParsingError
): HighlightResult | undefined {
  const strings: string[] = [];
  let errorIndex: undefined | number = undefined;

  function foundError() {
    if (errorIndex !== undefined) return;
    errorIndex = stripAnsi(strings.join(' ')).length;
  }

  if (error.nodes.length === 0) return;

  nodes.forEach(node => {
    if (error.nodes.includes(node)) {
      foundError();
      return strings.push(chalk.red(node.raw));
    } else {
      if (node.type === 'shortOptions') {
        let failed = false;
        let s = '';
        for (const option of node.options) {
          if (error.nodes.includes(option)) {
            s += chalk.red(option.raw);
            failed = true;
          } else {
            s += chalk.dim(option.raw);
          }
        }
        const prefix = failed ? chalk.red(`-`) : chalk.dim('-');
        if (failed) {
          foundError();
        }
        return strings.push(prefix + s);
      }

      return strings.push(chalk.dim(node.raw));
    }
  });

  return { colorized: strings.join(' '), errorIndex: errorIndex ?? 0 };
}

/**
 * An error UI
 *
 * @param breadcrumbs The command breadcrumbs to print with the error
 */
export function errorBox(
  nodes: AstNode[],
  errors: ParsingError[],
  breadcrumbs: string[]
): string {
  let withHighlight: { message: string; highlighted?: HighlightResult }[] = [];

  let errorMessages: string[] = [];

  for (const error of errors) {
    const highlighted = highlight(nodes, error);
    withHighlight.push({ message: error.message, highlighted });
  }

  let number = 1;
  const maxNumberWidth = String(withHighlight.length).length;

  errorMessages.push(
    chalk.red.bold('error: ') +
      'found ' +
      chalk.yellow(withHighlight.length) +
      ' error' +
      (withHighlight.length > 1 ? 's' : '')
  );
  errorMessages.push('');

  withHighlight
    .filter(x => x.highlighted)
    .forEach(x => {
      if (!x.highlighted) {
        throw new Error('WELP');
      }

      const pad = ''.padStart(x.highlighted.errorIndex);

      errorMessages.push(`  ${x.highlighted.colorized}`);
      for (const [index, line] of enumerate(x.message.split('\n'))) {
        const prefix = index === 0 ? chalk.bold('^') : ' ';
        const msg = chalk.red(`  ${pad} ${prefix} ${line}`);
        errorMessages.push(msg);
      }
      errorMessages.push('');
      number++;
    });

  const withNoHighlight = withHighlight.filter(x => !x.highlighted);

  if (number > 1) {
    if (withNoHighlight.length === 1) {
      errorMessages.push('Along the following error:');
    } else if (withNoHighlight.length > 1) {
      errorMessages.push('Along the following errors:');
    }
  }

  withNoHighlight.forEach(({ message }) => {
    const num = chalk.red.bold(
      `${padNoAnsi(number.toString(), maxNumberWidth, 'start')}.`
    );
    errorMessages.push(`  ${num} ${chalk.red(message)}`);
    number++;
  });

  const helpCmd = chalk.yellow(breadcrumbs.join(' ') + ' --help');

  errorMessages.push('');
  errorMessages.push(
    chalk.red.bold('hint: ') + `for more information, try '${helpCmd}'`
  );

  return errorMessages.join('\n');
}
