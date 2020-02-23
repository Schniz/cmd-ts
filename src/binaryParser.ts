import { Parser, Into } from './Parser';
import { ParseItem } from './argparse';

/**
 * Lifts a parser (`command` or `subcommands`) into a binary parser
 * that can take a complete `process.argv` without slicing
 *
 * @example
 * ```ts
 * const cmd = command({ ... });
 * const binary = binaryParser(cmd, 'my-app');
 * const result = parse(binary, process.argv);
 * ```
 */
export function binaryParser<P extends Parser<any>>(
  p: P,
  binaryName?: string
): Parser<Into<P>> {
  function parse(argv: string[], context: ParseItem[] = []) {
    const [, _binaryName, ...args] = argv;
    const newContext: ParseItem[] = [
      ...context,
      {
        type: 'positional',
        hide: true,
        position: 0,
        input: binaryName ?? _binaryName,
        name: 'binaryName',
        forced: false,
      },
    ];
    return p.parse(args, newContext);
  }

  return { parse };
}
