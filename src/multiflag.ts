import {
  ArgParser,
  ParsingResult,
  ParseContext,
  ParsingError,
} from './argparser';
import { From, OutputOf } from './from';
import { findOption } from './newparser/findOption';
import { ProvidesHelp, LongDoc, Descriptive, ShortDoc } from './helpdoc';
import { boolean } from './flag';
import { HasType } from './type';
import * as Either from './either';

type MultiFlagConfig<Decoder extends From<boolean[], any>> = HasType<Decoder> &
  LongDoc &
  Partial<Descriptive & ShortDoc>;

/**
 * Like `option`, but can accept multiple options, and expects a decoder from a list of strings.
 * An error will highlight all option occurences.
 */
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
    async parse({
      nodes,
      visitedNodes,
    }: ParseContext): Promise<ParsingResult<OutputOf<Decoder>>> {
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
        const decoded = await Either.safeAsync(
          boolean.from(option.value?.node.raw ?? 'true')
        );
        if (Either.isLeft(decoded)) {
          errors.push({ nodes: [option], message: decoded.error.message });
        } else {
          optionValues.push(decoded.value);
        }
      }

      if (errors.length > 0) {
        return {
          result: 'error',
          error: {
            errors,
          },
        };
      }

      const multiDecoded = await Either.safeAsync(
        config.type.from(optionValues)
      );

      if (Either.isLeft(multiDecoded)) {
        return Either.err({
          errors: [
            {
              nodes: options,
              message: multiDecoded.error.message,
            },
          ],
        });
      }

      return multiDecoded;
    },
  };
}
