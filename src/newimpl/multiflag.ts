import {
  ArgParser,
  ParsingResult,
  ParseContext,
  ParsingError,
} from './argparser';
import { From, OutputOf } from './from';
import { findOption } from '../newparser/findOption';
import { ProvidesHelp } from './helpdoc';
import { boolean } from './flag';

type MultiFlagConfig<Decoder extends From<boolean[], any>> = {
  decoder: Decoder;
  long: string;
  short?: string;
  description?: string;
};

export function multiflag<Decoder extends From<boolean[], any>>(
  config: MultiFlagConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp {
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
          description: config.description ?? 'self explanatory',
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

      for (const option of options) {
        visitedNodes.add(option);
      }

      const optionValues: boolean[] = [];
      const errors: ParsingError[] = [];

      for (const option of options) {
        const decoded = boolean.from(option.value?.node.raw ?? 'true');
        if (decoded.result === 'error') {
          errors.push({ nodes: [option], message: decoded.message });
        } else {
          optionValues.push(decoded.value);
        }
      }

      if (errors.length > 0) {
        return {
          outcome: 'failure',
          errors,
        };
      }

      const multiDecoded = config.decoder.from(optionValues);

      if (multiDecoded.result === 'error') {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: options,
              message: multiDecoded.message,
            },
          ],
        };
      }

      return { outcome: 'success', value: multiDecoded.value };
    },
  };
}
