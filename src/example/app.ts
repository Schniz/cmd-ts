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
  optional,
} from '..';
import { restPositionals } from '../restPositionals';
import { extendType } from '../type';

const complex = command({
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
    optionalOption: option({
      decoder: optional(string),
      long: 'optional-option',
    }),
    optionWithDefault: option({
      long: 'optional-with-default',
      env: 'SOME_ENV_VAR',
      decoder: {
        ...string,
        defaultValue: () => 'Hello',
        defaultValueAsString: () => 'Hello',
      },
    }),
    bool: flag({
      decoder: boolean,
      long: 'boolean',
    }),
    rest: restPositionals({
      decoder: string,
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
  aliases: ['read'],
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
});

const Name = extendType(string, {
  async from(s) {
    if (s.length === 0) {
      return { result: 'error', message: 'name cannot be empty' };
    } else if (s.charAt(0).toUpperCase() === s.charAt(0)) {
      return { result: 'ok', value: s };
    } else {
      return { result: 'error', message: 'name must be capitalized' };
    }
  },
  displayName: 'name',
});

const withSubcommands = subcommands({
  cmds: {
    complex,
    cat: withStream,
    greet: command({
      name: 'greet',
      description: 'greet a person',
      args: {
        times: option({
          decoder: { ...Integer, defaultValue: () => 1 },
          long: 'times',
        }),
        name: positional({
          displayName: 'name',
          decoder: Name,
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
  description: 'An awesome subcommand app!',
});

const cli = binary(withSubcommands);

async function main() {
  await run(cli, process.argv);
}

main();
