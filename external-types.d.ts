declare const Deno:
  | undefined
  | {
      exit(exitCode?: number): never;
      env: {
        get(key: string): string | undefined;
      };
    };
