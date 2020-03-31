import { subcommands, command, option, string, run } from '../src';

const sub1 = command({
  name: 'sub1',
  args: {
    name: option({ type: string, long: 'name' }),
  },
  handler: ({ name }) => {
    console.log({ name });
  },
});

const nested = subcommands({
  name: 'subcmds',
  cmds: {
    sub1,
  },
});

run(nested, process.argv.slice(2));
