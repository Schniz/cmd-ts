import { binary, command, run, number, option } from '../src';

export function createCmd() {
  const cmd = command({
    name: 'test',
    args: {
      number: option({
        long: 'number',
        type: number,
      }),
    },
    async handler(args) {
      console.log({ args });
    },
  });

  return cmd;
}

if (require.main === module) {
  const cmd = createCmd();
  run(binary(cmd), process.argv);
}
