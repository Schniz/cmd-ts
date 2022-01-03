import { ArgParser, Register, ParseContext } from './argparser';
import { boolean } from './types';
import { flag } from './flag';
import { ProvidesHelp, PrintHelp, Versioned } from './helpdoc';
import * as Result from './Result';
import { Exit } from './effects';

type CircuitBreaker = 'help' | 'version';

export const createHelpFlag = (short: string) => flag({
  long: 'help',
  short,
  type: boolean,
  description: 'show help',
});

export const versionFlag = flag({
  long: 'version',
  short: 'v',
  type: boolean,
  description: 'print the version',
});

export function handleCircuitBreaker(
  context: ParseContext,
  value: PrintHelp & Partial<Versioned>,
  breaker: Result.Result<any, CircuitBreaker>
): void {
  if (Result.isErr(breaker)) {
    return;
  }

  if (breaker.value === 'help') {
    const message = value.printHelp(context);
    throw new Exit({ exitCode: 1, message, into: 'stdout' });
  } else if (breaker.value === 'version') {
    const message = value.version || '0.0.0';
    throw new Exit({ exitCode: 0, message, into: 'stdout' });
  }
}

/**
 * Helper flags that are being used in `command` and `subcommands`:
 * `--help, -h` to show help
 * `--version, -v` to show the current version
 *
 * It is called circuitbreaker because if you have `--help` or `--version`
 * anywhere in your argument list, you'll see the version and the help for the closest command
 */
export function createCircuitBreaker(
  withVersion: boolean,
  helpShortIdentifier: string = 'h'
): ArgParser<CircuitBreaker> & ProvidesHelp & Register {
  const helpFlag = createHelpFlag(helpShortIdentifier)
  return {
    register(opts) {
      helpFlag.register(opts);
      if (withVersion) {
        versionFlag.register(opts);
      }
    },
    helpTopics() {
      const helpTopics = helpFlag.helpTopics();
      if (withVersion) {
        helpTopics.push(...versionFlag.helpTopics());
      }
      return helpTopics;
    },
    async parse(context) {
      const help = await helpFlag.parse(context);
      const version = withVersion
        ? await versionFlag.parse(context)
        : undefined;

      if (Result.isErr(help) || (version && Result.isErr(version))) {
        const helpErrors = Result.isErr(help) ? help.error.errors : [];
        const versionErrors =
          version && Result.isErr(version) ? version.error.errors : [];
        return Result.err({ errors: [...helpErrors, ...versionErrors] });
      }

      if (help.value) {
        return Result.ok('help');
      } else if (version?.value) {
        return Result.ok('version');
      } else {
        return Result.err({
          errors: [
            {
              nodes: [],
              message: 'Neither help nor version',
            },
          ],
        });
      }
    },
  };
}
