#!/usr/bin/env YARN_SILENT=1 yarn ts-node --

import { command } from './command';
import { option } from './option';
import { flag } from './flag';
import { positional } from './positional';
import { string, boolean, number } from '../test/test-types';
import { run } from './runner';
import { From } from './from';
import { extendType } from './type';
import { multiflag } from './multiflag';
import { subcommands } from './subcommands';
import { binary } from './binary';
import { restPositionals } from './restPositionals';

const loglevel: From<boolean[], number> = {
  from(booleans) {
    return { result: 'ok', value: booleans.filter(Boolean).length };
  },
};

const capitalizedString = extendType(string, {
  from: s => ({
    result: 'ok',
    value: s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
  }),
  description: 'string. will be capitalized',
});

const greet = command({
  name: 'greet',
  description: 'Greet someone',

  args: {
    greeter: positional({ decoder: string, displayName: 'greeter' }),
    times: option({
      decoder: { ...number, defaultValue: () => 1 },
      description: 'amount of times to print',
      long: 'times',
      short: 't',
    }),
    greeting: option({
      decoder: {
        ...string,
        defaultValue: () => 'Hello',
        defaultValueAsString: () => 'Hello',
      },
      env: 'MY_GREETING',
      short: 'g',
      long: 'greeting',
    }),
    exclaim: flag({
      decoder: boolean,
      long: 'exclaim',
      short: 'e',
      env: 'SERIOUS_BUSINESS',
    }),
    names: restPositionals({ decoder: capitalizedString, displayName: 'name' }),
  },
  handler(args) {
    for (let i = 0; i < args.times; i++) {
      console.log(
        `${i + 1}. ${args.greeter} says: ${args.greeting}, ${args.names.join(
          ' & '
        )}${args.exclaim ? '!' : ''}`
      );
    }
  },
});

const cmd = command({
  name: 'cmd',
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
    cmds: { test: cmd, greet },
  })
);

run(cli, process.argv);
