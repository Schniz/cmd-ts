export class Exit {
  constructor(
    public readonly config: {
      exitCode: number;
      message: string;
      into: 'stdout' | 'stderr';
    }
  ) {}
}
