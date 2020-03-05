import { ArgParser, ParsingResult, ParseContext } from './argparser';
import { OutputOf, extend } from './from';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp, Descriptive } from './helpdoc';
import { Type } from './type';

type FlagConfig<Decoder extends Type<boolean, any>> = {
  decoder: Decoder;
  long: string;
  short?: string;
  description?: string;
};

export const boolean: Type<string, boolean> = {
  from(str) {
    if (str === 'true') return { result: 'ok', value: true };
    if (str === 'false') return { result: 'ok', value: false };
    return {
      result: 'error',
      message: `expected value to be either "true" or "false". got: "${str}"`,
    };
  },
  displayName: 'true/false',
};

export function flag<Decoder extends Type<boolean, any>>(
  config: FlagConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp & Partial<Descriptive> {
  const decoder = extend(boolean, config.decoder);

  return {
    description: config.description ?? config.decoder.description,
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
          description:
            config.description ??
            config.decoder.description ??
            'self explanatory',
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
