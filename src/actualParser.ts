#!/usr/bin/env YARN_SILENT=1 yarn ts-node --

import { command } from './newimpl/command';
import { option } from './newimpl/option';
import { flag } from './newimpl/flag';
import { positional } from './newimpl/positional';
import { string, boolean, number } from '../test/newimpl/test-types';
import { run } from './newimpl/runner';

const cmd = command({
  name: 'My app',
  failOnUnknownArguments: true,
  args: {
    pos1: positional({ decoder: string, displayName: 'pos1' }),
    flag: flag({ decoder: boolean, short: 'f', long: 'flag' }),
    pos2: positional({ decoder: string, displayName: 'pos2' }),
    opt: option({ decoder: number, short: 'n', long: 'number' }),
  },
  handler: console.log,
});

const result = run(cmd, process.argv.slice(2));
console.log(result);
