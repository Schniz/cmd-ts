import {
  ArgParser,
  ParsingResult,
  ParseContext,
  ParsingError,
} from './argparser';
import { OutputOf } from './from';
import { PositionalArgument } from './newparser/parser';
import { Type } from './type';
import { ProvidesHelp } from './helpdoc';

type RestPositionalsConfig<Decoder extends Type<string, any>> = {
  type: Decoder;
  displayName?: string;
};

/**
 * Read all the positionals and decode them using the type provided.
 * Works best when it is the last item on the `command` construct, to be
 * used like the `...rest` operator in JS and TypeScript.
 */
export function restPositionals<Decoder extends Type<string, any>>(
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
          description: config.type.description ?? '',
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
        const decoded = await config.type.from(positional.raw);
        if (decoded.result === 'ok') {
          results.push(decoded.value);
        } else {
          errors.push({
            nodes: [positional],
            message: decoded.message,
          });
        }
      }

      if (errors.length > 0) {
        return {
          outcome: 'failure',
          errors,
        };
      }

      return {
        outcome: 'success',
        value: results,
      };
    },
  };
}
