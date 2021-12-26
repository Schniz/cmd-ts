# File System Battery Pack

The file system battery pack contains the following types:

### `ExistingPath`

```typescript
import { ExistingPath } from 'cmd-ts/batteries/fs';
```

Resolves into a path that exists. Fails if the path does not exist.
If a relative path is provided (`../file`), it will expand by using the current working directory.

### `Directory`

```typescript
import { Directory } from 'cmd-ts/batteries/fs';
```

Resolves into a path of an existing directory. If an existing file was given, it'll use its `dirname`.

### `File`

```typescript
import { File } from 'cmd-ts/batteries/fs';
```

Resolves into an existing file. Fails if the provided path is not a file.
