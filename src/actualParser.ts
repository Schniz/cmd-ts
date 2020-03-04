#!/usr/bin/env YARN_SILENT=1 yarn ts-node --

import { command } from './newimpl/command';
import { option } from './newimpl/option';
import { flag } from './newimpl/flag';
import { positional } from './newimpl/positional';
import { string, boolean, number } from '../test/newimpl/test-types';
import { run } from './newimpl/runner';
import { From } from './newimpl/from';
import { multiflag } from './newimpl/multiflag';
import { subcommands } from './newimpl/subcommands';
import { binary } from './newimpl/binary';

const loglevel: From<boolean[], number> = {
  from(booleans) {
    return { result: 'ok', value: booleans.filter(Boolean).length };
  },
};

const greet = command({
  name: 'greet',
  failOnUnknownArguments: true,
  description: 'Greet someone',

  args: {
    name: positional({ decoder: string, displayName: 'name' }),
    times: option({
      decoder: number,
      description: 'amount of times to print',
      long: 'times',
      short: 't',
    }),
    greeting: option({ decoder: string, long: 'greeting' }),
    exclaim: flag({ decoder: boolean, long: 'exclaim', short: 'e' }),
  },

  handler(args) {
    for (let i = 0; i < args.times; i++) {
      console.log(
        `${i + 1}. ${args.greeting}, ${args.name}${args.exclaim ? '!' : ''}`
      );
    }
  },
});

const cmd = command({
  name: 'cmd',
  failOnUnknownArguments: true,
  version: '1.0.0-cmd',
  args: {
    pos1: positional({ decoder: string, displayName: 'pos1' }),
    flag: flag({ decoder: boolean, short: 'f', long: 'flag' }),
    pos2: positional({ decoder: string, displayName: 'pos2' }),
    opt: option({ decoder: number, short: 'n', long: 'number' }),
    opt2: option({ decoder: number, short: 'x', long: 'number2' }),
    loglevel: multiflag({ decoder: loglevel, long: 'verbose', short: 'v' }),
  },
  handler: args => {
    console.log(args);
    return args.opt;
  },
});

const cli = binary(
  subcommands({
    name: 'some-cli',
    cmds: { cmd, greet },
  })
);

run(cli, process.argv);
