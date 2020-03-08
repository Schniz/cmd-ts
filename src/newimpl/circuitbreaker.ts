import { ArgParser } from './argparser';
import { boolean } from '../types';
import { flag } from './flag';
import { ProvidesHelp } from './helpdoc';

type CircuitBreaker = 'help' | 'version';

export const helpFlag = flag({
  long: 'help',
  short: 'h',
  decoder: boolean,
  description: 'show help',
});

export const versionFlag = flag({
  long: 'version',
  short: 'v',
  decoder: boolean,
  description: 'print the version',
});

export const circuitbreaker: ArgParser<CircuitBreaker> & ProvidesHelp = {
  register(opts) {
    helpFlag.register(opts);
    versionFlag.register(opts);
  },
  helpTopics() {
    return [helpFlag, versionFlag].flatMap(x => x.helpTopics());
  },
  parse(context) {
    const help = helpFlag.parse(context);
    const version = versionFlag.parse(context);

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
