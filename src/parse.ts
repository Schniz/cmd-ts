import { Parser, Into } from './Parser';
import { prettyPrint } from './prettyPrint';

/**
 * Parse arguments and exit on errors
 *
 * @param parser The command to parse with
 * @param args String arguments to pass to the command
 * @example
 * ```ts
 * const mycommand = command({ name: { kind: 'positional', type: t.string });
 * const { name, _ } = parse(mycommand, ['hello', 'world']);
 * console.log(name); // => "hello"
 * console.log(_); // => ["world"]
 * ```
 */
export function parse<P extends Parser<any>>(
  parser: P,
  args: string[]
): Into<P> {
  const result = parser.parse(args);
  if (result._tag === 'Right') return result.right;
  prettyPrint(result.left);
  process.exit(1);
}
