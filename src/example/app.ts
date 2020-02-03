#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import * as t from 'io-ts';
import { IntOfStr, ReadStream } from './test-types';
import {
  ensureCliSuccess,
  command,
  subcommands,
  binaryParser,
  single,
  bool,
} from '../command';

const y = command(
  {
    pos1: {
      kind: 'positional',
      displayName: 'pos1',
      type: IntOfStr,
      description: 'some integer number',
    },
    named1: {
      kind: 'named',
      type: single(IntOfStr),
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

const withStream = command({
  stream: {
    kind: 'positional',
    displayName: 'stream',
    type: ReadStream,
  },
}, 'A simple `cat` clone');

// const result = y.parse(process.argv.slice(2));

const withSubcommands = subcommands({
  hello: y,
  cat: withStream,
  greet: command({
    name: {
      kind: 'positional',
      type: t.string,
    },
  }),
  composed: subcommands({
    cat: withStream,
  })
}, `my wonderful multicommand app`);

const cli = binaryParser(withSubcommands, 'app');

async function main() {
  const v = cli.parse(process.argv);
  ensureCliSuccess(v);
  const result = v.right;

  if (result.command === 'cat') {
    result.args[0].stream.pipe(process.stdout);
  } else if (result.command === 'hello') {
    console.log(result.args[0].bool);
  } else if (result.command === 'composed' && result.args.command === 'cat') {
    result.args.args[0].stream.pipe(process.stdout);
  } else {
    console.log(result);
  }
}

main();
