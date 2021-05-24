import {
  subcommands,
  mutuallyExclusive,
  command,
  option,
  string,
  run,
  number,
  flag,
} from '../src';

const sub1 = command({
  name: 'sub1',
  args: {
    name: option({ type: string, long: 'name' }),
    mutually: mutuallyExclusive({
      nickname: option({ long: 'nick' }),
      age: option({ long: 'age', type: number }),
    }),
  },
  handler: ({ name, mutually }) => {
    console.log({ name });
    console.log({ mutually });
  },
});

const deploy = command({
  name: 'deploy',
  args: {
    where: mutuallyExclusive({
      staging: flag({ long: 'staging' }),
      production: flag({ long: 'production' }),
    }),
  },
  handler: ({ where }) => {
    console.log(`deploying to`, where);
  },
});

const nested = subcommands({
  name: 'subcmds',
  cmds: {
    sub1,
    deploy,
  },
});

run(nested, process.argv.slice(2));
