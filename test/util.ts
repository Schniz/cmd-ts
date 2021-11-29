import execa, { ExecaReturnValue } from 'execa';
import path from 'path';

export function app(
  scriptPath: string
): (args: string[]) => Promise<ExecaReturnValue> {
  return async (args) => {
    jest.setTimeout(10000);
    const result = await execa(
      path.join(__dirname, '../scripts/ts-node'),
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
