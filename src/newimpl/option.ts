import {
  ArgParser,
  ParsingError,
  ParsingResult,
  ParseContext,
} from './argparser';
import { From, OutputOf } from './from';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp } from './helpdoc';

type OptionConfig<Decoder extends From<string, any>> = {
  decoder: Decoder;
  long: string;
  short?: string;
  description?: string;
};

export function option<Decoder extends From<string, any>>(
  config: OptionConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp {
  return {
    helpTopics() {
      let usage = `--${config.long} <value>`;
      if (config.short) {
        usage += `, -${config.short}=<value>`;
      }

      return [
        {
          category: 'options',
          usage,
          defaults: [],
          description: config.description ?? 'self explainatory',
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
      visitedNodes.add(option);

      if (!option.value) {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: [option],
              message: `No value provided for --${config.long}`,
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
