import {
  ArgParser,
  ParsingResult,
  ParseContext,
  ParsingError,
} from './argparser';
import { From, OutputOf } from './from';
import { PositionalArgument } from '../newparser/parser';

type RestPositionalsConfig<Decoder extends From<string, any>> = {
  decoder: Decoder;
};

export function restPositionals<Decoder extends From<string, any>>(
  config: RestPositionalsConfig<Decoder>
): ArgParser<OutputOf<Decoder>[]> {
  return {
    register(_opts) {},
    parse({
      nodes,
      visitedNodes,
    }: ParseContext): ParsingResult<OutputOf<Decoder>[]> {
      const positionals = nodes.filter(
        (node): node is PositionalArgument =>
          node.type === 'positionalArgument' && !visitedNodes.has(node)
      );

      const results: OutputOf<Decoder>[] = [];
      let errors: ParsingError[] = [];

      for (const positional of positionals) {
        visitedNodes.add(positional);
        const decoded = config.decoder.from(positional.raw);
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
