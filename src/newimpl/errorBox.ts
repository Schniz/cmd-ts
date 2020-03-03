import { ParsingError } from './argparser';
import chalk from 'chalk';
import { AstNode } from '../newparser/parser';

function highlight(nodes: AstNode[], error: ParsingError): string | undefined {
  if (error.nodes.length === 0) return;
  return nodes
    .map(node => {
      if (error.nodes.includes(node)) {
        return chalk.red(node.raw);
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
          return prefix + s;
        }

        return chalk.dim(node.raw);
      }
    })
    .join(' ');
}

export function errorBox(nodes: AstNode[], errors: ParsingError[]): string {
  let withHighlight: { message: string; highlighted?: string }[] = [];

  let errorMessages: string[] = [];

  for (const error of errors) {
    const highlighted = highlight(nodes, error);
    withHighlight.push({ message: error.message, highlighted });
  }

  let number = 1;

  withHighlight
    .filter(x => !x.highlighted)
    .forEach(({ message }) => {
      errorMessages.push(`${number}. ${message}`);
      number++;
    });

  withHighlight
    .filter(x => x.highlighted)
    .forEach(x => {
      errorMessages.push(`${number}. ${x.message}`);
      errorMessages.push(chalk.dim('  > ') + x.highlighted);
      number++;
    });

  return errorMessages.join('\n');
}
