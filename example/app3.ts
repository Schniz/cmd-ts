import {
  subcommands,
  eitherParser,
  command,
  option,
  string,
  run,
  number,
} from '../src';

const sub1 = command({
  name: 'sub1',
  args: {
    name: option({ type: string, long: 'name' }),
    eithers: eitherParser(
      option({ long: 'nick' }),
      option({ long: 'age', type: number })
    ),
  },
  handler: ({ name, eithers }) => {
    console.log({ name });
    console.log({ eithers });
  },
});

const nested = subcommands({
  name: 'subcmds',
  cmds: {
    sub1,
  },
});

run(nested, process.argv.slice(2));
