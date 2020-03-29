/**
 * "Effects" are custom exceptions that can do stuff.
 * The concept comes from React, where they throw a `Promise` to provide the ability to write
 * async code with synchronous syntax.
 *
 * These effects _should stay an implementation detail_ and not leak out of the library.
 *
 * @packageDocumentation
 */

import chalk from 'chalk';

/**
 * An effect to exit the program with a message
 *
 * **Why this is an effect?**
 *
 * Using `process.exit` in a program is both a problem:
 * * in tests, because it needs to be mocked somehow
 * * in browser usage, because it does not have `process` at all
 *
 * Also, using `console.log` is something we'd rather avoid and return strings, and if returning strings
 * would be harmful for performance we might ask for a stream to write to: 
 * Printing to stdout and stderr means that we don't control the values and it ties us to only use `cmd-ts`
 * with a command line, and again, to mock `stdout` and `stderr` it if we want to test it.
 */
export class Exit {
  constructor(
    public readonly config: {
      exitCode: number;
      message: string;
      into: 'stdout' | 'stderr';
    }
  ) {}

  run(): never {
    const output = this.output();
    output(this.config.message);
    process.exit(this.config.exitCode);
  }

  dryRun(): string {
    const { into, message, exitCode } = this.config;
    const exitMessage = chalk.dim(`process exits with status ${exitCode}`);
    return `${chalk.dim(into)}:\n${message}\n\n${exitMessage}`;
  }

  private output() {
    if (this.config.into === 'stderr') {
      return console.error;
    } else {
      return console.log;
    }
  }
}
