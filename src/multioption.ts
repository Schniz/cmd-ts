import {
  ArgParser,
  ParsingResult,
  ParseContext,
  ParsingError,
} from './argparser';
import { OutputOf } from './from';
import { findOption } from './newparser/findOption';
import { ProvidesHelp, LongDoc, ShortDoc, Descriptive } from './helpdoc';
import { Type, HasType } from './type';
import { AstNode } from './newparser/parser';
import * as Result from './Result';

type MultiOptionConfig<Decoder extends Type<string[], any>> = HasType<Decoder> &
  LongDoc &
  Partial<ShortDoc & Descriptive>;

/**
 * Like `option`, but can accept multiple options, and expects a decoder from a list of strings.
 * An error will highlight all option occurences.
 */
export function multioption<Decoder extends Type<string[], any>>(
  config: MultiOptionConfig<Decoder>
): ArgParser<OutputOf<Decoder>> & ProvidesHelp {
  return {
    helpTopics() {
      const displayName = config.type.displayName ?? 'value';
      let usage = `--${config.long} <${displayName}>`;
      if (config.short) {
        usage += `, -${config.short}=<${displayName}>`;
      }
      return [
        {
          category: 'options',
          usage,
          defaults: [],
          description: config.description ?? 'self explanatory',
        },
      ];
    },
    register(opts) {
      opts.forceOptionLongNames.add(config.long);
      if (config.short) {
        opts.forceOptionShortNames.add(config.short);
      }
    },
    async parse({
      nodes,
      visitedNodes,
    }: ParseContext): Promise<ParsingResult<OutputOf<Decoder>>> {
      const options = findOption(nodes, {
        longNames: [config.long],
        shortNames: config.short ? [config.short] : [],
      }).filter((x) => !visitedNodes.has(x));

      for (const option of options) {
        visitedNodes.add(option);
      }

      const optionValues: string[] = [];
      const errors: ParsingError[] = [];
      const flagNodes: AstNode[] = [];

      for (const option of options) {
        const providedValue = option.value?.node.raw;
        if (providedValue === undefined) {
          flagNodes.push(option);
          continue;
        }
        optionValues.push(providedValue);
      }

      if (flagNodes.length > 0) {
        errors.push({
          nodes: flagNodes,
          message: `Expected to get a value, found a flag`,
        });
      }

      if (errors.length > 0) {
        return Result.err({ errors });
      }

      const multiDecoded = await Result.safeAsync(
        config.type.from(optionValues)
      );

      if (Result.isErr(multiDecoded)) {
        return Result.err({
          errors: [{ nodes: options, message: multiDecoded.error.message }],
        });
      }

      return multiDecoded;
    },
  };
}
