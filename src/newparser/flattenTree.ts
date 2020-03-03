import { AstNode, ShortOptions, ShortOption } from './parser';
import { enumerate } from './enumerate';

export function flattenTree(nodes: AstNode[]): any {
  const options: Record<string, string[]> = {};
  const flags = new Set<string>();
  const positional: string[] = [];
  function add(key: string, value?: string) {
    if (value) {
      options[key] = options[key] || [];
      options[key].push(value);
    } else {
      flags.add(key);
    }
  }

  for (const node of nodes) {
    switch (node.type) {
      case 'longOption': {
        add(node.key, node.value?.node.raw);
        break;
      }

      case 'shortOptions': {
        for (const option of node.options) {
          add(option.key, option.value?.node.raw);
        }
        break;
      }

      case 'positionalArgument': {
        positional.push(node.raw);
        break;
      }
    }
  }

  return { options, flags, positional };
}
