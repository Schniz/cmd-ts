import { normalizeMinimist } from './normalMinimist';
import minimist from 'minimist';
import { Parser, ParseError } from './Parser';
import { Either } from 'fp-ts/lib/Either';
import { ParsingContext } from './ParsingContext';
export { program } from './CommandBuilder';
export { ensureCliSuccess } from './ensureCliSuccess';

export function parse<Cmd>(
  argv: string[],
  command: Parser<Cmd>
): Either<ParseError, Cmd> {
  const args = normalizeMinimist(minimist(argv));
  const context = new ParsingContext();
  return command.parse(args, context);
}
