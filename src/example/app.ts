import { program, ensureCliSuccess } from '..';
// import * as t from 'io-ts';
import {
  IntOfStr,
  ReadStream,
  readStreamToString,
  BoolOfStr,
  commaSeparated,
  flattened,
} from './test-types';

const p = program("test-app", "0.1.0")
  .namedArg({ name: 'someBool', type: BoolOfStr })
  .namedArg({ name: 'anInteger', type: IntOfStr })
  .namedArg({ name: 'commas', type: commaSeparated(IntOfStr) })
  .multiNamedArg({ name: 'multipleNumbers', type: flattened(commaSeparated(IntOfStr)) })
  .namedArg({ name: 'stream', type: ReadStream });

async function main() {
  const result = p.parse(process.argv.slice(2));
  ensureCliSuccess(result);

  const { stream, ...other } = result.right;
  const streamContents = await readStreamToString(stream);
  console.log({ streamContents, ...other });
}

main();
