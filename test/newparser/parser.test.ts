import { tokenize } from '../../src/newparser/tokenizer';
import { parse } from '../../src/newparser/parser';
import { createRegisterOptions } from '../createRegisterOptions';

test('dash in the middle of a word', () => {
  const tokens = tokenize(['hello', 'world', 'you-know', 'my', 'friend']);
  const tree = parse(tokens, createRegisterOptions());
  expect(tree).toMatchInlineSnapshot(`
    Array [
      Object {
        "index": 0,
        "raw": "hello",
        "type": "positionalArgument",
      },
      Object {
        "index": 6,
        "raw": "world",
        "type": "positionalArgument",
      },
      Object {
        "index": 12,
        "raw": "you-know",
        "type": "positionalArgument",
      },
      Object {
        "index": 21,
        "raw": "my",
        "type": "positionalArgument",
      },
      Object {
        "index": 24,
        "raw": "friend",
        "type": "positionalArgument",
      },
    ]
  `);
});

test('welp', () => {
  const argv = `scripts/ts-node src/example/app.ts cat /tmp/a --help`.split(
    ' '
  );
  const tokens = tokenize(argv);
  const tree = parse(tokens, createRegisterOptions());
  expect(tree).toMatchInlineSnapshot(`
    Array [
      Object {
        "index": 0,
        "raw": "scripts/ts-node",
        "type": "positionalArgument",
      },
      Object {
        "index": 16,
        "raw": "src/example/app.ts",
        "type": "positionalArgument",
      },
      Object {
        "index": 35,
        "raw": "cat",
        "type": "positionalArgument",
      },
      Object {
        "index": 39,
        "raw": "/tmp/a",
        "type": "positionalArgument",
      },
      Object {
        "index": 46,
        "key": "help",
        "raw": "--help",
        "type": "longOption",
        "value": undefined,
      },
    ]
  `);
});
