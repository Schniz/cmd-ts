import { ArgParser, ParsingResult, ParseContext } from './argparser';
import { findOption } from './newparser/findOption';
import {
  ProvidesHelp,
  Descriptive,
  ShortDoc,
  LongDoc,
  EnvDoc,
} from './helpdoc';
import { Type, extendType, OutputOf, HasType } from './type';
import chalk from 'chalk';
import { Default } from './default';
import { AllOrNothing } from './utils';

type FlagConfig<Decoder extends Type<boolean, any>> = LongDoc &
  HasType<Decoder> &
  Partial<ShortDoc & Descriptive & EnvDoc> &
  AllOrNothing<Default<OutputOf<Decoder>>>;

/**
 * A decoder from `string` to `boolean`
 * works for `true` and `false` only.
 */
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

/**
 * Decodes an argument which is in the form of a key and a boolean value, and allows parsing the following ways:
 *
 * - `--long` where `long` is the provided `long`
 * - `-s=value` where `s` is the provided `short`
 * Shorthand forms can be combined:
 * - `-abcd` will call all flags for the short forms of `a`, `b`, `c` and `d`.
 * @param config flag configurations
 */
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

      const defaultValueFn = config.defaultValue ?? config.type.defaultValue;
      const defaultValueIsSerializable =
        config.defaultValueIsSerializable ??
        config.type.defaultValueIsSerializable;

      if (defaultValueFn && defaultValueIsSerializable) {
        const defaultValue = defaultValueFn();
        defaults.push('default: ' + chalk.italic(defaultValue));
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
