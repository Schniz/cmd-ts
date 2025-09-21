# Options

A command line option is an argument or arguments in the following formats:

- `--long-key value`
- `--long-key=value`
- `-s value`
- `-s=value`

where `long-key` is "the long form key" and `s` is "a short form key".

There are two ways to parse options:

- [The `option` parser](#option) which parses one and only one option
- [The `multioption` parser](#multioption) which parser none or multiple options

## `option`

Parses one and only one option. Accepts a `Type` from `string` to any value to decode the users' intent.

In order to make this optional, either the type provided or a `defaultValue` function should be provided. In order to make a certain type optional, you can take a look at [`optional`](../included_types.md#optionaltype)

This parser will fail to parse if:

- There are zero options that match the long form key or the short form key
- There are more than one option that match the long form key or the short form key
- No value was provided (if it was treated like [a flag](./flags.md))
- Decoding the user input fails

### Usage

```ts
import { command, number, option } from 'cmd-ts';

const myNumber = option({
  type: number,
  long: 'my-number',
  short: 'n',
});

const cmd = command({
  name: 'my number',
  args: { myNumber },
});
```

### Dynamic Defaults with `onMissing`

The `onMissing` callback provides a way to dynamically generate values when an option is not provided. This is perfect for interactive prompts:

```ts
import { command, option, string } from './src';
import { createInterface } from 'readline/promises';

const name = option({
  type: string,
  long: 'name',
  short: 'n',
  description: 'Your name for the greeting',
  onMissing: async () => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      const answer = await rl.question("What's your name? ");
      return answer.trim() || 'Anonymous';
    } finally {
      rl.close();
    }
  },
});

const cmd = command({
  name: 'greeting',
  args: { name },
  handler: ({ name }) => {
    console.log(`Hello, ${name}!`);
  },
});
```

### Config

- `type` (required): A type from `string` to any value
- `long` (required): The long form key
- `short`: The short form key
- `description`: A short description regarding the option
- `displayName`: A short description regarding the option
- `defaultValue`: A function that returns a default value for the option
- `defaultValueIsSerializable`: Whether to print the defaultValue as a string in the help docs.
- `onMissing`: A function (sync or async) that returns a value when the option is not provided. Used as fallback if `defaultValue` is not provided.

## `multioption`

Parses multiple or zero options. Accepts a `Type` from `string[]` to any value, letting you do the conversion yourself.

> **Note:** using `multioption` will drop all the contextual errors. Every error on the type conversion will show up as if all of the options were errored. This is a higher level with less granularity.

This parser will fail to parse if:

- No value was provided (if it was treated like [a flag](./flags.md))
- Decoding the user input fails

### Dynamic Defaults for `multioption`

Like single options, `multioption` supports `onMissing` callbacks for dynamic default arrays:

```ts
import { command, multioption } from 'cmd-ts';
import type { Type } from 'cmd-ts';

const stringArray: Type<string[], string[]> = {
  async from(strings) {
    return strings;
  },
  displayName: 'string',
};

const includes = multioption({
  type: stringArray,
  long: 'include',
  short: 'i',
  description: 'Files to include',
  onMissing: async () => {
    // Auto-discover files when none specified
    const files = await glob('src/**/*.ts');
    return files;
  },
});

const cmd = command({
  name: 'build',
  args: { includes },
  handler: ({ includes }) => {
    console.log(`Processing files: ${includes.join(', ')}`);
  },
});
```

### Config

- `type` (required): A type from `string[]` to any value
- `long` (required): The long form key
- `short`: The short form key
- `description`: A short description regarding the option
- `displayName`: A short description regarding the option
- `defaultValue`: A function that returns a default value for the option array in case no options were provided. If not provided, the default value will be an empty array.
- `defaultValueIsSerializable`: Whether to print the defaultValue as a string in the help docs.
- `onMissing`: A function (sync or async) that returns a value when the option is not provided. Used as fallback if `defaultValue` is not provided.
