import { normalizeMinimist, NormalizedMinimist } from './normalMinimist';
import minimist from 'minimist';
import { ParseError } from './Parser';
import { Either } from 'fp-ts/lib/Either';
export { program } from './CommandBuilder';
export { ensureCliSuccess } from './ensureCliSuccess';

interface Parser<Into> {
  parse(args: NormalizedMinimist): Either<ParseError, Into>;
}

export function parse<Cmd>(
  argv: string[],
  command: Parser<Cmd>
): Either<ParseError, Cmd> {
  const args = normalizeMinimist(minimist(argv));
  return command.parse(args);
}
