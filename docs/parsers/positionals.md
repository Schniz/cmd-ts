# Positional Arguments

Read positional arguments. Positional arguments are all the arguments that are not an [option](./options.md) or a [flag](./options.md). So in the following command line invocation for the `my-app` command:

```
my-app greet --greeting Hello Joe
       ^^^^^                  ^^^  - positional arguments
```

## `positional`

Fetch a single positional argument

Configuration:

* `displayName` (required): a display name for the named argument. This is required so it'll be understandable what the argument is for
* `type` (required): a [Type](../included_types.md) from `string` that will help decoding the value provided by the user
* `description`: a short text describing what this argument is for

## `restPositionals`

Fetch all the rest positionals

> **Note:** this will swallaow all the other positionals, so you can't use [`positional`](#positional) to fetch a positional afterwards.

Configuration:

* `displayName`: a display name for the named argument.
* `type` (required): a [Type](../included_types.md) from `string` that will help decoding the value provided by the user. Each argument will go through this.
* `description`: a short text describing what these arguments are for
