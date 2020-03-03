import { ArgParser, ParsingResult, ParseContext } from './argparser';
import { From, OutputOf, extend } from './from';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp } from './helpdoc';

type FlagConfig<Decoder extends From<boolean, any>> = {
  decoder: Decoder;
  long: string;
  short?: string;
  description?: string;
};

const boolean: From<string, boolean> = {
  from(str) {
    if (str === 'true') return { result: 'ok', value: true };
    if (str === 'false') return { result: 'ok', value: false };
    return {
      result: 'error',
      message: `expected value to be either "true" or "false". got: "${str}"`,
    };
  },
};

export function flag<Decoder extends From<boolean, any>>(
  config: FlagConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp {
  const decoder = extend(boolean, config.decoder);

  return {
    helpTopics() {
      let usage = `--${config.long}`;
      if (config.short) {
        usage += `, -${config.short}`;
      }
      return [
        {
          category: 'flags',
          usage,
          defaults: [],
          description: config.description ?? 'self explainatory',
        },
      ];
    },
    register(opts) {
      opts.forceFlagLongNames.add(config.long);
      if (config.short) {
        opts.forceFlagShortNames.add(config.short);
      }
    },
    parse({
      nodes,
      visitedNodes,
    }: ParseContext): ParsingResult<OutputOf<Decoder>> {
      const options = findOption(nodes, {
        longNames: [config.long],
        shortNames: config.short ? [config.short] : [],
      }).filter(x => !visitedNodes.has(x));

      if (options.length > 1) {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: options,
              message: 'Expected 1 occurence, got ' + options.length,
            },
          ],
        };
      }

      if (options[0]) {
        visitedNodes.add(options[0]);
      }

      const value = options[0]
        ? options[0]?.value?.node?.raw ?? 'true'
        : 'false';
      const decoded = decoder.from(value);

      if (decoded.result === 'error') {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: options,
              message: decoded.message,
            },
          ],
        };
      }

      return { outcome: 'success', value: decoded.value };
    },
  };
}
