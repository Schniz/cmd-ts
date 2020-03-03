import { AstNode, LongOption, ShortOption } from './parser';

type Option = LongOption | ShortOption;

export function findOption(
  nodes: AstNode[],
  opts: {
    longNames: string[];
    shortNames: string[];
  }
): Option[] {
  const result: Option[] = [];

  for (const node of nodes) {
    if (node.type === 'longOption' && opts.longNames.includes(node.key)) {
      result.push(node);
      continue;
    }

    if (node.type === 'shortOptions' && opts.shortNames.length) {
      for (const option of node.options) {
        if (opts.shortNames.includes(option.key)) {
          result.push(option);
        }
      }
    }
  }

  return result;
}
