import {
  ArgParser,
  ParsingResult,
  ParseContext,
  ParsingError,
} from './argparser';
import { OutputOf } from './from';
import { PositionalArgument } from './newparser/parser';
import { Type, HasType } from './type';
import { ProvidesHelp, Displayed, Descriptive } from './helpdoc';
import * as Result from './Result';
import { string } from './types';

type RestPositionalsConfig<Decoder extends Type<string, any>> =
  HasType<Decoder> & Partial<Displayed & Descriptive>;

/**
 * Read all the positionals and decode them using the type provided.
 * Works best when it is the last item on the `command` construct, to be
 * used like the `...rest` operator in JS and TypeScript.
 */
function fullRestPositionals<Decoder extends Type<string, any>>(
  config: RestPositionalsConfig<Decoder>
): ArgParser<OutputOf<Decoder>[]> & ProvidesHelp {
  return {
    helpTopics() {
      const displayName =
        config.displayName ?? config.type.displayName ?? 'arg';
      return [
        {
          usage: `[...${displayName}]`,
          category: 'arguments',
          defaults: [],
          description: config.description ?? config.type.description ?? '',
        },
      ];
    },
    register(_opts) {},
    async parse({
      nodes,
      visitedNodes,
    }: ParseContext): Promise<ParsingResult<OutputOf<Decoder>[]>> {
      const positionals = nodes.filter(
        (node): node is PositionalArgument =>
          node.type === 'positionalArgument' && !visitedNodes.has(node)
      );

      const results: OutputOf<Decoder>[] = [];
      let errors: ParsingError[] = [];

      for (const positional of positionals) {
        visitedNodes.add(positional);
        const decoded = await Result.safeAsync(
          config.type.from(positional.raw)
        );
        if (Result.isOk(decoded)) {
          results.push(decoded.value);
        } else {
          errors.push({
            nodes: [positional],
            message: decoded.error.message,
          });
        }
      }

      nodes
        .filter((x) => x.type === 'forcePositional')
        .forEach((x) => visitedNodes.add(x));

      if (errors.length > 0) {
        return Result.err({
          errors,
        });
      }

      return Result.ok(results);
    },
  };
}

type StringType = Type<string, string>;

type RestPositionalsParser<Decoder extends Type<string, any>> = ArgParser<
  OutputOf<Decoder>[]
> &
  ProvidesHelp;

/**
 * Read all the positionals and decode them using the type provided.
 * Works best when it is the last item on the `command` construct, to be
 * used like the `...rest` operator in JS and TypeScript.
 *
 * @param config rest positionals argument config
 */
export function restPositionals<Decoder extends Type<string, any>>(
  config: HasType<Decoder> & Partial<Displayed & Descriptive>
): RestPositionalsParser<Decoder>;
export function restPositionals(
  config?: Partial<HasType<never> & Displayed & Descriptive>
): RestPositionalsParser<StringType>;
export function restPositionals(
  config?: Partial<HasType<any>> & Partial<Displayed & Descriptive>
): RestPositionalsParser<any> {
  return fullRestPositionals({
    type: string,
    ...config,
  });
}
