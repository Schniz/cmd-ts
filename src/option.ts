import {
  ArgParser,
  ParsingError,
  ParsingResult,
  ParseContext,
} from './argparser';
import { OutputOf } from './from';
import { findOption } from './newparser/findOption';
import {
  ProvidesHelp,
  Descriptive,
  LongDoc,
  EnvDoc,
  ShortDoc,
} from './helpdoc';
import { Type, HasType } from './type';
import chalk from 'chalk';
import { Default } from './default';
import { AllOrNothing } from './utils';
import * as Result from './Result';
import { string } from './types';

type OptionConfig<Decoder extends Type<string, any>> = LongDoc &
  HasType<Decoder> &
  Partial<Descriptive & EnvDoc & ShortDoc> &
  AllOrNothing<Default<OutputOf<Decoder>>>;

function fullOption<Decoder extends Type<string, any>>(
  config: OptionConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp & Partial<Descriptive> {
  return {
    description: config.description ?? config.type.description,
    helpTopics() {
      const displayName = config.type.displayName ?? 'value';
      let usage = `--${config.long}`;
      if (config.short) {
        usage += `, -${config.short}`;
      }
      usage += ` <${displayName}>`;

      const defaults: string[] = [];

      if (config.env) {
        const env =
          process.env[config.env] === undefined
            ? ''
            : `=${chalk.italic(process.env[config.env])}`;
        defaults.push(`env: ${config.env}${env}`);
      }

      const defaultValueFn = config.defaultValue ?? config.type.defaultValue;

      if (defaultValueFn) {
        try {
          const defaultValue = defaultValueFn();
          if (
            config.defaultValueIsSerializable ??
            config.type.defaultValueIsSerializable
          ) {
            defaults.push('default: ' + chalk.italic(defaultValue));
          } else {
            defaults.push('optional');
          }
        } catch (e) {}
      }

      return [
        {
          category: 'options',
          usage,
          defaults,
          description:
            config.description ?? config.type.description ?? 'self explanatory',
        },
      ];
    },
    register(_opts) {},
    async parse({
      nodes,
      visitedNodes,
    }: ParseContext): Promise<ParsingResult<OutputOf<Decoder>>> {
      const options = findOption(nodes, {
        longNames: [config.long],
        shortNames: config.short ? [config.short] : [],
      }).filter((x) => !visitedNodes.has(x));

      options.forEach((opt) => visitedNodes.add(opt));

      if (options.length > 1) {
        const error: ParsingError = {
          message:
            'Too many times provided. Expected 1, got: ' + options.length,
          nodes: options,
        };
        return Result.err({ errors: [error] });
      }

      const valueFromEnv = config.env ? process.env[config.env] : undefined;

      const option = options[0];
      let rawValue: string;
      let envPrefix = '';
      const defaultValueFn = config.defaultValue ?? config.type.defaultValue;

      if (option?.value) {
        rawValue = option.value.node.raw;
      } else if (valueFromEnv !== undefined) {
        rawValue = valueFromEnv;
        envPrefix = `env[${chalk.italic(config.env)}]: `;
      } else if (!option && typeof defaultValueFn === 'function') {
        try {
          return Result.ok(defaultValueFn());
        } catch (e) {
          const message = `Default value not found for '--${config.long}': ${e.message}`;
          return Result.err({
            errors: [
              {
                nodes: [],
                message,
              },
            ],
          });
        }
      } else {
        const raw =
          option?.type === 'shortOption'
            ? `-${option?.key}`
            : `--${option?.key ?? config.long}`;
        return Result.err({
          errors: [
            {
              nodes: options,
              message: `No value provided for ${raw}`,
            },
          ],
        });
      }

      const decoded = await Result.safeAsync(config.type.from(rawValue));
      if (Result.isErr(decoded)) {
        return Result.err({
          errors: [
            { nodes: options, message: envPrefix + decoded.error.message },
          ],
        });
      }

      return Result.ok(decoded.value);
    },
  };
}

type StringType = Type<string, string>;

/**
 * Decodes an argument which is in the form of a key and a value, and allows parsing the following ways:
 *
 * - `--long=value` where `long` is the provided `long`
 * - `--long value` where `long` is the provided `long`
 * - `-s=value` where `s` is the provided `short`
 * - `-s value` where `s` is the provided `short`
 * @param config flag configurations
 */
export function option<Decoder extends Type<string, any>>(
  config: LongDoc &
    HasType<Decoder> &
    Partial<Descriptive & EnvDoc & ShortDoc> &
    AllOrNothing<Default<OutputOf<Decoder>>>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp & Partial<Descriptive>;
export function option(
  config: LongDoc & Partial<HasType<never> & Descriptive & EnvDoc & ShortDoc>
): ArgParser<OutputOf<StringType>> & ProvidesHelp & Partial<Descriptive>;
export function option(
  config: LongDoc &
    Partial<HasType<any>> &
    Partial<Descriptive & EnvDoc & ShortDoc>
): ArgParser<OutputOf<any>> & ProvidesHelp & Partial<Descriptive> {
  return fullOption({
    type: string,
    ...config,
  });
}
