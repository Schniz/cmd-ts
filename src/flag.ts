import { ArgParser, ParsingResult, ParseContext } from './argparser';
import { findOption } from './newparser/findOption';
import { ProvidesHelp, Descriptive } from './helpdoc';
import { Type, extendType, OutputOf } from './type';
import chalk from 'chalk';

type FlagConfig<Decoder extends Type<boolean, any>> = {
  type: Decoder;
  long: string;
  short?: string;
  description?: string;
  env?: string;
};

export const boolean: Type<string, boolean> = {
  async from(str) {
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
  const decoder = extendType(boolean, config.type);

  return {
    description: config.description ?? config.type.description,
    helpTopics() {
      let usage = `--${config.long}`;
      if (config.short) {
        usage += `, -${config.short}`;
      }
      const defaults: string[] = [];

      if (config.env) {
        const env =
          process.env[config.env] === undefined
            ? ''
            : `=${chalk.italic(process.env[config.env])}`;
        defaults.push(`env: ${config.env}${env}`);
      }

      if (typeof config.type.defaultValueAsString === 'function') {
        const defaultAsString = config.type.defaultValueAsString();
        defaults.push('default: ' + chalk.italic(defaultAsString));
      }

      return [
        {
          category: 'flags',
          usage,
          defaults,
          description:
            config.description ?? config.type.description ?? 'self explanatory',
        },
      ];
    },
    register(opts) {
      opts.forceFlagLongNames.add(config.long);
      if (config.short) {
        opts.forceFlagShortNames.add(config.short);
      }
    },
    async parse({
      nodes,
      visitedNodes,
    }: ParseContext): Promise<ParsingResult<OutputOf<Decoder>>> {
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

      const valueFromEnv = config.env ? process.env[config.env] : undefined;
      let rawValue: string;
      let envPrefix = '';

      if (options.length === 0 && valueFromEnv !== undefined) {
        rawValue = valueFromEnv;
        envPrefix = `env[${chalk.italic(config.env)}]: `;
      } else if (
        options.length === 0 &&
        typeof config.type.defaultValue === 'function'
      ) {
        return { outcome: 'success', value: config.type.defaultValue() };
      } else if (options.length === 1) {
        rawValue = options[0].value?.node.raw ?? 'true';
      } else {
        return {
          outcome: 'failure',
          errors: [
            { nodes: [], message: `No value provided for --${config.long}` },
          ],
        };
      }

      const decoded = await decoder.from(rawValue);

      if (decoded.result === 'error') {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: options,
              message: envPrefix + decoded.message,
            },
          ],
        };
      }

      return { outcome: 'success', value: decoded.value };
    },
  };
}
