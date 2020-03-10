import { ArgParser } from './argparser';
import { boolean } from './types';
import { flag } from './flag';
import { ProvidesHelp } from './helpdoc';
import { flatMap } from './utils';

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

    if (help.outcome === 'failure' || version.outcome === 'failure') {
      const helpErrors = help.outcome === 'failure' ? help.errors : [];
      const versionErrors = version.outcome === 'failure' ? version.errors : [];
      return { outcome: 'failure', errors: [...helpErrors, ...versionErrors] };
    }

    if (help.value) {
      return { outcome: 'success', value: 'help' };
    } else if (version.value) {
      return { outcome: 'success', value: 'version' };
    } else {
      return {
        outcome: 'failure',
        errors: [
          {
            nodes: [],
            message: 'Neither help nor version',
          },
        ],
      };
    }
  },
};
