# `binary`

A standard Node executable will receive two additional arguments that are often omitted:
* the node executable path
* the command path

`cmd-ts` provides a small helper that ignores the first two positional arguments that a command receives:

```ts
import { binary, command, run } from 'cmd-ts';

const myCommand = command({ /* ... */ });
const binaryCommand = binary(myCommand)
run(binaryCommand, process.argv);
```
