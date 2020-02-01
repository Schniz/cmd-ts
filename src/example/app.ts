#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import * as t from 'io-ts';
import { IntOfStr, ReadStream, readStreamToString } from './test-types';
import {
  ensureCliSuccess,
  command,
  subcommands,
  binaryParser,
  single,
} from '../CommandBuilder4';

const y = command({
  pos1: {
    kind: 'positional',
    displayName: 'pos1',
    type: IntOfStr,
  },
  named1: single({
    kind: 'named',
    type: IntOfStr,
    short: 'n',
    long: 'number',
  }),
});

const withStream = command({
  stream: {
    kind: 'positional',
    displayName: 'stream',
    type: ReadStream,
  }
})

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
});

const cli = binaryParser(withSubcommands, 'app');


async function main() {
  const v = cli.parse(process.argv);
  ensureCliSuccess(v);
  const result = v.right;

  if (result.command === 'cat') {
    result.args[0].stream.pipe(process.stdout);
  } else {
    console.log(result);
  }
}

main();
