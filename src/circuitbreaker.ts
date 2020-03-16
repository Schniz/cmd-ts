import { ArgParser } from './argparser';
import { boolean } from './types';
import { flag } from './flag';
import { ProvidesHelp } from './helpdoc';
import { flatMap } from './utils';
import * as Result from './Result';

type CircuitBreaker = 'help' | 'version';

export const helpFlag = flag({
  long: 'help',
  short: 'h',
  type: boolean,
  description: 'show help',
});

export const versionFlag = flag({
  long: 'version',
  short: 'v',
  type: boolean,
  description: 'print the version',
});

/**
 * Helper flags that are being used in `command` and `subcommands`:
 * `--help, -h` to show help
 * `--version, -v` to show the current version
 *
 * It is called circuitbreaker because if you have `--help` or `--version`
 * anywhere in your argument list, you'll see the version and the help for the closest command
 */
export const circuitbreaker: ArgParser<CircuitBreaker> & ProvidesHelp = {
  register(opts) {
    helpFlag.register(opts);
    versionFlag.register(opts);
  },
  helpTopics() {
    return flatMap([helpFlag, versionFlag], x => x.helpTopics());
  },
  async parse(context) {
    const help = await helpFlag.parse(context);
    const version = await versionFlag.parse(context);

    if (Result.isErr(help) || Result.isErr(version)) {
      const helpErrors = Result.isErr(help) ? help.error.errors : [];
      const versionErrors = Result.isErr(version) ? version.error.errors : [];
      return Result.err({ errors: [...helpErrors, ...versionErrors] });
    }

    if (help.value) {
      return Result.ok('help');
    } else if (version.value) {
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
