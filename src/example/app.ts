#!/usr/bin/env YARN_SILENT=1 yarn ts-node

/* istanbul ignore file */

import { Integer, ReadStream } from './test-types';
import {
  command,
  subcommands,
  run,
  binary,
  string,
  boolean,
  flag,
  option,
  positional,
} from '..';

const y = command({
  args: {
    pos1: positional({
      displayName: 'pos1',
      decoder: Integer,
    }),
    named1: option({
      decoder: Integer,
      short: 'n',
      long: 'number',
    }),
    bool: flag({
      decoder: boolean,
      long: 'boolean',
    }),
  },
  name: 'printer',
  description: 'Just prints the arguments',
  handler: args => console.log(`I got`, args),
});

const withStream = command({
  args: {
    stream: positional({
      displayName: 'stream',
      decoder: ReadStream,
    }),
  },
  description: 'A simple `cat` clone',
  name: 'cat',
  handler: result => {
    /** @export cat -> stream */
    const stream = result.stream;
    stream.pipe(process.stdout);
  },
});

const composed = subcommands({
  name: 'another-command',
  cmds: {
    cat: withStream,
  },
  description: 'a nested subcommand',
  // aliases: ['cmp'],
});

const withSubcommands = subcommands({
  cmds: {
    hello: y,
    cat: withStream,
    greet: command({
      name: 'greet',
      description: 'greet a person',
      args: {
        name: positional({
          displayName: 'name',
          decoder: string,
        }),
        noExclaim: flag({
          decoder: boolean,
          long: 'no-exclaim',
        }),
        greeting: option({
          long: 'greeting',
          decoder: string,
          description: 'the greeting to say',
          env: 'GREETING_NAME',
        }),
      },
      handler: result => {
        const args = result;
        /** @export greet -> greeting */
        const greeting = args.greeting;
        /** @export greet -> noExclaim */
        const noExclaim = args.noExclaim;
        /** @export greet -> name */
        const name = args.name;
        const exclaim = noExclaim ? '' : '!';
        console.log(`${greeting}, ${name}${exclaim}`);
      },
    }),
    composed,
  },
  name: 'subcmds',
});

const cli = binary(withSubcommands);

async function main() {
  run(cli, process.argv);

  //   if (result.command === 'cat') {
  //     /** @export cat -> stream */
  //     const stream = result.args.stream;
  //     stream.pipe(process.stdout);
  //   } else if (result.command === 'greet') {
  //     const args = result.args;
  //     /** @export greet -> greeting */
  //     const greeting = args.greeting;
  //     /** @export greet -> noExclaim */
  //     const noExclaim = args.noExclaim;
  //     /** @export greet -> name */
  //     const name = args.name;
  //     const exclaim = noExclaim ? '' : '!';
  //     console.log(`${greeting}, ${name}${exclaim}`);
  //   } else if (result.command === 'hello') {
  //     console.log(result.args.bool);
  //   } else if (result.command === 'composed' && result.args.command === 'cat') {
  //     /** @export composed -> cat -> stream */
  //     const stream = result.args.args.stream;
  //     stream.pipe(process.stdout);
  //   } else {
  //     console.log(result);
  //   }
}

main();
