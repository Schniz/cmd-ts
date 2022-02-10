import {
  subcommands,
  command,
  option,
  string,
  run,
  positional,
  number,
  optional,
} from '../src';

const sub1 = command({
  name: 'sub1',
  args: {
    name: option({ type: string, long: 'name' }),
  },
  handler: ({ name }) => {
    console.log({ name });
  },
});

const sub2 = command({
  name: 'sub2',
  args: {
    age: positional({ type: optional(number) }),
    name: positional({ type: optional(string) }),
  },
  handler({ name, age }) {
    console.log({ name, age });
  },
});

const nested = subcommands({
  name: 'subcmds',
  cmds: {
    sub1,
    sub2,
  },
});

run(nested, process.argv.slice(2));
