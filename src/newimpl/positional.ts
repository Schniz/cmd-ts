import { ArgParser, ParsingResult, ParseContext } from './argparser';
import { From, OutputOf } from './from';
import { PositionalArgument } from '../newparser/parser';
import { ProvidesHelp, Descriptive } from './helpdoc';

type PositionalConfig<
  Decoder extends From<string, any> & Partial<Descriptive>
> = {
  decoder: Decoder;
  displayName: string;
  description?: string;
};

export function positional<
  Decoder extends From<string, any> & Partial<Descriptive>
>(
  config: PositionalConfig<Decoder>
): ArgParser<OutputOf<Decoder>[]> & ProvidesHelp {
  return {
    helpTopics() {
      return [
        {
          category: 'arguments',
          usage: `<${config.displayName}>`,
          description:
            config.description ??
            config.decoder.description ??
            'self explainatory',
          defaults: [],
        },
      ];
    },
    register(_opts) {},
    parse({
      nodes,
      visitedNodes,
    }: ParseContext): ParsingResult<OutputOf<Decoder>[]> {
      const positionals = nodes.filter(
        (node): node is PositionalArgument =>
          node.type === 'positionalArgument' && !visitedNodes.has(node)
      );

      const positional = positionals[0];

      if (!positional) {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: [],
              message: `No value provided for ${config.displayName}`,
            },
          ],
        };
      }

      visitedNodes.add(positional);
      const decoded = config.decoder.from(positional.raw);

      if (decoded.result === 'error') {
        return {
          outcome: 'failure',
          errors: [
            {
              nodes: [positional],
              message: decoded.message,
            },
          ],
        };
      }

      return { outcome: 'success', value: decoded.value };
    },
  };
}
