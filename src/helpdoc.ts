import { ParseContext } from './argparser';

export type Descriptive = {
  /** A long description */
  description: string;
};

export type Versioned = {
  version: string;
};

export type Named = {
  name: string;
};

export type Displayed = {
  /** A short display name that summarizes it */
  displayName: string;
};

export type HelpTopic = {
  category: string;
  usage: string;
  description: string;
  defaults: string[];
};

export type ProvidesHelp = {
  helpTopics(): HelpTopic[];
};

export type PrintHelp = {
  printHelp(context: ParseContext): void;
};

export type Aliased = {
  aliases: string[];
};
