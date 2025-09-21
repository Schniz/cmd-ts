# Flags

A command line flag is an argument or arguments in the following formats:

- `--long-key`
- `--long-key=true` or `--long-key=false`
- `-s`
- `-s=true` or `--long-key=false`

where `long-key` is "the long form key" and `s` is "a short form key".

Flags can also be stacked using their short form. Let's assume we have flags with the short form keys of `a`, `b` and `c`: `-abc` will be parsed the same as `-a -b -c`.

There are two ways to parse flags:

- [The `flag` parser](#flag) which parses one and only one flag
- [The `multiflag` parser](#multiflag) which parser none or multiple flags

## `flag`

Parses one and only one flag. Accepts a `Type` from `boolean` to any value to decode the users' intent.

In order to make this optional, either the type provided or a `defaultValue` function should be provided. In order to make a certain type optional, you can take a look at [`optional`](../included_types.md#optionaltype)

This parser will fail to parse if:

- There are zero flags that match the long form key or the short form key
- There are more than one flag that match the long form key or the short form key
- A value other than `true` or `false` was provided (if it was treated like [an option](./options.md))
- Decoding the user input fails

### Usage

```ts
import { command, boolean, flag } from 'cmd-ts';

const myFlag = flag({
  type: boolean,
  long: 'my-flag',
  short: 'f',
});

const cmd = command({
  name: 'my flag',
  args: { myFlag },
});
```

### Dynamic Defaults with `onMissing`

The `onMissing` callback provides a way to dynamically generate values when a flag is not provided. This is useful for environment-based defaults, configuration file lookups, or user prompts.

```ts
import { command, flag } from 'cmd-ts';

const verboseFlag = flag({
  long: 'verbose',
  short: 'v',
  description: 'Enable verbose output',
  onMissing: () => {
    // Check environment variable as fallback
    return process.env.NODE_ENV === 'development';
  },
});

const debugFlag = flag({
  long: 'debug',
  short: 'd',
  description: 'Enable debug mode',
  onMissing: async () => {
    // Async example: check config file or make API call
    const config = await loadConfig();
    return config.debug || false;
  },
});

const cmd = command({
  name: 'my app',
  args: { 
    verbose: verboseFlag,
    debug: debugFlag,
  },
  handler: ({ verbose, debug }) => {
    console.log(`Verbose: ${verbose}, Debug: ${debug}`);
  },
});
```

### Config

- `type` (required): A type from `boolean` to any value
- `long` (required): The long form key
- `short`: The short form key
- `description`: A short description regarding the option
- `displayName`: A short description regarding the option
- `defaultValue`: A function that returns a default value for the option
- `defaultValueIsSerializable`: Whether to print the defaultValue as a string in the help docs.
- `onMissing`: A function (sync or async) that returns a value when the flag is not provided. Used as fallback if `defaultValue` is not provided.

## `multiflag`

Parses multiple or zero flags. Accepts a `Type` from `boolean[]` to any value, letting you do the conversion yourself.

> **Note:** using `multiflag` will drop all the contextual errors. Every error on the type conversion will show up as if all of the options were errored. This is a higher level with less granularity.

This parser will fail to parse if:

- A value other than `true` or `false` was provided (if it was treated like [an option](./options.md))
- Decoding the user input fails

### Config

- `type` (required): A type from `boolean[]` to any value
- `long` (required): The long form key
- `short`: The short form key
- `description`: A short description regarding the flag
- `displayName`: A short description regarding the flag
