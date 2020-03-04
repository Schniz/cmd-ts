import {
  ArgParser,
  ParsingError,
  ParsingResult,
  ParseContext,
} from './argparser';
import { From, OutputOf } from './from';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp, Descriptive, Displayed } from './helpdoc';

type OptionConfig<Decoder extends From<string, any>> = {
  decoder: Decoder;
  long: string;
  short?: string;
  description?: string;
};

export function option<
  Decoder extends From<string, any> & Partial<Descriptive & Displayed>
>(config: OptionConfig<Decoder>): ArgParser<OutputOf<Decoder>> & ProvidesHelp {
  return {
    helpTopics() {
      const displayName = config.decoder.displayName ?? 'value';
      let usage = `--${config.long} <${displayName}>`;
      if (config.short) {
        usage += `, -${config.short}=<${displayName}>`;
      }

      return [
        {
          category: 'options',
          usage,
          defaults: [],
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

      if (options.length === 0) {
        return {
          outcome: 'failure',
          errors: [
            { nodes: [], message: `No value provided for --${config.long}` },
          ],
        };
      }

      const option = options[0];

      if (!option.value) {
        const raw =
          option.type === 'shortOption' ? `-${option.key}` : `--${option.key}`;
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: [option],
              message: `No value provided for ${raw}`,
            },
          ],
        };
      }

      const decoded = config.decoder.from(option.value.node.raw);
      if (decoded.result === 'error') {
        return {
          outcome: 'failure',
          errors: [{ nodes: [option], message: decoded.message }],
        };
      }

      return {
        outcome: 'success',
        value: decoded.value,
      };
    },
  };
}
