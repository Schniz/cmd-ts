import { execa, ExecaReturnValue } from 'execa';

export function app(
  scriptPath: string
): (args: string[]) => Promise<ExecaReturnValue> {
  return async (args) => {
    const result = await execa(
      require.resolve('tsx/cli'),
      [scriptPath, ...args],
      {
        all: true,
        reject: false,
        env: {
          FORCE_COLOR: 'true',
        },
      }
    );
    return result;
  };
}
