type ParsedItem =
  | { type: 'subcommand'; inputValue: string };

export class ParsingContext {
  readonly items: ParsedItem[] = [];
  readonly relevantNamedArguments = new Set<string>();

  add(pi: ParsedItem): this {
    this.items.push(pi);
    return this;
  }
}
