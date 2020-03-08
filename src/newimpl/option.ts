import {
  ArgParser,
  ParsingError,
  ParsingResult,
  ParseContext,
} from './argparser';
import { OutputOf } from './from';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp, Descriptive } from './helpdoc';
import { Type } from './type';
import chalk from 'chalk';

type OptionConfig<Decoder extends Type<string, any>> = {
  decoder: Decoder;
  long: string;
  short?: string;
  description?: string;
  env?: string;
};

export function option<Decoder extends Type<string, any>>(
  config: OptionConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp & Partial<Descriptive> {
  return {
    description: config.description ?? config.decoder.description,
    helpTopics() {
      const displayName = config.decoder.displayName ?? 'value';
      let usage = `--${config.long} <${displayName}>`;
      if (config.short) {
        usage += `, -${config.short}=<${displayName}>`;
      }

      const defaults: string[] = [];

      if (config.env) {
        const env =
          process.env[config.env] === undefined
            ? ''
            : `=${chalk.italic(process.env[config.env])}`;
        defaults.push(`env: ${config.env}${env}`);
      }

      if (typeof config.decoder.defaultValue === 'function') {
        const defaultAsString = config.decoder.defaultValueAsString?.();
        if (defaultAsString) {
          defaults.push('default: ' + chalk.italic(defaultAsString));
        } else {
          defaults.push('optional');
        }
      }

      return [
        {
          category: 'options',
          usage,
          defaults,
          description:
            config.description ??
            config.decoder.description ??
            'self explanatory',
        },
      ];
    },
    register(_opts) {},
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
        const error: ParsingError = {
          message:
            'Too many times provided. Expected 1, got: ' + options.length,
          nodes: options,
        };
        return {
          outcome: 'failure',
          errors: [error],
        };
      }

      const valueFromEnv = config.env ? process.env[config.env] : undefined;

      const option = options[0];
      let rawValue: string;
      let envPrefix = '';

      if (option?.value) {
        rawValue = option.value.node.raw;
      } else if (valueFromEnv !== undefined) {
        rawValue = valueFromEnv;
        envPrefix = `env[${chalk.italic(config.env)}]: `;
      } else if (!option && typeof config.decoder.defaultValue === 'function') {
        return {
          outcome: 'success',
          value: config.decoder.defaultValue(),
        };
      } else {
        const raw =
          option?.type === 'shortOption'
            ? `-${option?.key}`
            : `--${option?.key ?? config.long}`;
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: options,
              message: `No value provided for ${raw}`,
            },
          ],
        };
      }

      const decoded = config.decoder.from(rawValue);
      if (decoded.result === 'error') {
        return {
          outcome: 'failure',
          errors: [{ nodes: options, message: envPrefix + decoded.message }],
        };
      }

      return {
        outcome: 'success',
        value: decoded.value,
      };
    },
  };
}
