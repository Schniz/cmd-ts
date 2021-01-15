# Included Types

### `string`

A simple `string => string` type. Useful for [`option`](./parsers/options.md) and [`positional`](./parsers/positionals.md) arguments

### `boolean`

A simple `boolean => boolean` type. Useful for [`flag`](./parsers/flags.md)

### `number`

A `string => number` type. Checks that the input is indeed a number or fails with a descriptive error message.

### `optional(type)`

Takes a type and makes it nullable by providing a default value of `undefined`

### `array(type)`

Takes a type and turns it into an array of type, useful for [`multioption`](./parsers/options.md) and [`multiflag`](./parsers/flags.md).

### `union([types])`

Tries to decode the types provided until it succeeds, or throws all the errors combined. There's an optional configuration to this function:

- `combineErrors`: function that takes a list of strings (the error messages) and returns a string which is the combined error message. The default value for it is to join with a newline: `xs => xs.join("\n")`.

### `oneOf(["string1", "string2", ...])`

Takes a closed set of string values to decode from. An exact enum.
