#!/usr/bin/env YARN_SILENT=1 yarn ts-node

/* istanbul ignore file */

import * as t from 'io-ts';
import { Integer, ReadStream } from './test-types';
import {
  ensureCliSuccess,
  command,
  subcommands,
  binaryParser,
  single,
  bool,
  named,
  boolean,
  positional,
} from '../command';

const y = command(
  {
    pos1: positional({
      displayName: 'pos1',
      type: Integer,
      description: 'some integer number',
    }),
    named1: named({
      type: single(Integer),
      short: 'n',
      long: 'number',
    }),
    bool: boolean({
      type: t.array(bool),
      long: 'boolean',
    }),
  },
  'Just prints the arguments'
);

const withStream = command(
  {
    stream: positional({
      displayName: 'stream',
      type: ReadStream,
      description: 'A file/url to read',
    }),
  },
  'A simple `cat` clone'
);

const withSubcommands = subcommands(
  {
    hello: y,
    cat: withStream,
    greet: command({
      name: positional({
        type: t.string,
      }),
      noExclaim: boolean({
        type: single(bool),
        long: 'no-exclaim',
      }),
      greeting: named({
        type: single(t.string),
        description: 'the greeting to say',
        env: 'GREETING_NAME',
        defaultValue: 'hello',
      }),
    }),
    composed: subcommands({
      cat: withStream,
    }),
  },
  `my wonderful multicommand app`
);

const cli = binaryParser(withSubcommands, 'app');

async function main() {
  const v = cli.parse(process.argv);
  ensureCliSuccess(v);
  const result = v.right;

  if (result.command === 'cat') {
    result.args[0].stream.pipe(process.stdout);
  } else if (result.command === 'greet') {
    const { greeting, name, noExclaim } = result.args[0];
    const exclaim = noExclaim ? '' : '!';
    console.log(`${greeting}, ${name}${exclaim}`);
  } else if (result.command === 'hello') {
    console.log(result.args[0].bool);
  } else if (result.command === 'composed' && result.args.command === 'cat') {
    result.args.args[0].stream.pipe(process.stdout);
  } else {
    console.log(result);
  }
}

main();
