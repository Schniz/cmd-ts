import { parse, program, ensureCliSuccess } from '..';
// import * as t from 'io-ts';
import {
  IntOfStr,
  ReadStream,
  readStreamToString,
  commaSeparated,
  flattened,
} from './test-types';
import { ComposedCommand } from '../ComposedCommand2';

const p = program('test-app', '0.1.0')
  .boolArg({ name: 'someBool' })
  .namedArg({ name: 'anInteger', type: IntOfStr })
  .namedArg({ name: 'commas', type: commaSeparated(IntOfStr) })
  .namedArg({ name: 'stream', type: ReadStream })
  .multiNamedArg({
    name: 'multipleNumbers',
    type: flattened(commaSeparated(IntOfStr)),
  });

const welp = program('welp', '0.1.0').namedArg({ name: 'int', type: IntOfStr });
const howdy = program('welp', '0.1.0').namedArg({
  name: 'int',
  type: IntOfStr,
});

// const composedCommand = ComposedCommand.new('test', p).subcommand('welp', welp).subcommand('howdy', howdy);
const composedCommand = ComposedCommand.new('test', p)
  .subcommand('welp', welp)
  .subcommand('howdy', howdy)
  .subcommand('how', howdy);

function main2() {
  const y = parse(process.argv.slice(2), composedCommand);
  ensureCliSuccess(y);
  const x = (function() {
    switch (y.right.command) {
      case 'test':
        return y.right.args[0].stream;
      case 'howdy':
        return y.right.args[0].int;
      case 'welp':
        return y.right.args[0].int;
    }
  })();
  console.log(y);
  console.log({ x });
}

// composedCommand.subcommandParser.test;

// async function main1() {
//   const result = parse(process.argv.slice(2), p);
//   ensureCliSuccess(result);
//   const [{ stream, ...other }, positional] = result.right;
//   const streamContents = await readStreamToString(stream);
//   console.log({ streamContents, ...other, positional });
// }

// async function main1() {
//   const result = parse(process.argv.slice(2), composedCommand);
//   ensureCliSuccess(result);

//   if (result.right.command === 'welp') {
//     console.log('WELP!');
//   } else {
//     const [{ stream, ...other }, positional] = result.right.parsed;
//     const streamContents = await readStreamToString(stream);
//     console.log({ streamContents, ...other, positional });
//   }
// }

main2();
