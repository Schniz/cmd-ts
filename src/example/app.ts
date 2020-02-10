#!/usr/bin/env YARN_SILENT=1 yarn ts-node

/* istanbul ignore file */

import * as t from 'io-ts';
import { Integer, ReadStream } from './test-types';
import {
  command,
  subcommands,
  parse,
  binaryParser,
  single,
  bool,
} from '../command';

const y = command(
  {
    pos1: {
      kind: 'positional',
      displayName: 'pos1',
      type: Integer,
      description: 'some integer number',
    },
    named1: {
      kind: 'named',
      type: single(Integer),
      short: 'n',
      long: 'number',
    },
    bool: {
      kind: 'boolean',
      type: t.array(bool),
      long: 'boolean',
    },
  },
  'Just prints the arguments'
);

const withStream = command(
  {
    stream: {
      kind: 'positional',
      displayName: 'stream',
      type: ReadStream,
      description: 'A file/url to read',
    },
  },
  'A simple `cat` clone'
);

const withSubcommands = subcommands(
  {
    hello: y,
    cat: withStream,
    greet: command({
      name: {
        kind: 'positional',
        type: t.string,
      },
      noExclaim: {
        kind: 'named',
        type: single(bool),
        long: 'no-exclaim',
      },
      greeting: {
        kind: 'named',
        type: single(t.string),
        description: 'the greeting to say',
        env: 'GREETING_NAME',
        defaultValue: 'hello',
      },
    }),
    composed: subcommands({
      cat: withStream,
    }),
  },
  `my wonderful multicommand app`
);

const cli = binaryParser(withSubcommands, 'app');

async function main() {
  const result = parse(cli, process.argv);

  if (result.command === 'cat') {
    /** @export cat -> stream */
    const stream = result.args[0].stream;
    stream.pipe(process.stdout);
  } else if (result.command === 'greet') {
    const args = result.args[0];
    /** @export greet -> greeting */
    const greeting = args.greeting;
    /** @export greet -> noExclaim */
    const noExclaim = args.noExclaim;
    /** @export greet -> name */
    const name = args.name;
    const exclaim = noExclaim ? '' : '!';
    console.log(`${greeting}, ${name}${exclaim}`);
  } else if (result.command === 'hello') {
    console.log(result.args[0].bool);
  } else if (result.command === 'composed' && result.args.command === 'cat') {
    /** @export composed -> cat -> stream */
    const stream = result.args.args[0].stream;
    stream.pipe(process.stdout);
  } else {
    console.log(result);
  }
}

main();
