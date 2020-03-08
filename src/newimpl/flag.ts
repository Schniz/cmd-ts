import { ArgParser, ParsingResult, ParseContext } from './argparser';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp, Descriptive } from './helpdoc';
import { Type, extend, OutputOf } from './type';

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
  defaultValue: () => false,
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
      options.forEach(opt => visitedNodes.add(opt));

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

      if (
        options.length === 0 &&
        typeof config.decoder.defaultValue === 'function'
      ) {
        return { outcome: 'success', value: config.decoder.defaultValue() };
      } else if (options.length === 0) {
        return {
          outcome: 'failure',
          errors: [
            { nodes: [], message: `No value provided for --${config.long}` },
          ],
        };
      }

      const value = options[0]?.value?.node?.raw ?? 'true';
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
