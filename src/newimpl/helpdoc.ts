export type Descriptive = {
  description: string;
};

export type Versioned = {
  version: string;
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
  printHelp(): void;
};
