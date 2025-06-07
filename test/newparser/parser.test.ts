import { expect, test } from "vitest";
import { type AstNode, parse } from "../../src/newparser/parser";
import { tokenize } from "../../src/newparser/tokenizer";
import { createRegisterOptions } from "../createRegisterOptions";

test("dash in the middle of a word", () => {
	const tokens = tokenize(["hello", "world", "you-know", "my", "friend"]);
	const tree = parse(tokens, createRegisterOptions());
	expect(tree).toMatchInlineSnapshot(`
    [
      {
        "index": 0,
        "raw": "hello",
        "type": "positionalArgument",
      },
      {
        "index": 6,
        "raw": "world",
        "type": "positionalArgument",
      },
      {
        "index": 12,
        "raw": "you-know",
        "type": "positionalArgument",
      },
      {
        "index": 21,
        "raw": "my",
        "type": "positionalArgument",
      },
      {
        "index": 24,
        "raw": "friend",
        "type": "positionalArgument",
      },
    ]
  `);
});

test(`parses forcePositional if it is the last token`, () => {
	const argv = `scripts/ts-node src/example/app.ts cat /tmp/a --`.split(" ");
	const tokens = tokenize(argv);
	const tree = parse(tokens, createRegisterOptions());
	expect(tree.map((x) => x.type)).toContain<AstNode["type"]>("forcePositional");
});

test("welp", () => {
	const argv = `scripts/ts-node src/example/app.ts cat /tmp/a --help`.split(
		" ",
	);
	const tokens = tokenize(argv);
	const tree = parse(tokens, createRegisterOptions());
	expect(tree).toMatchInlineSnapshot(`
    [
      {
        "index": 0,
        "raw": "scripts/ts-node",
        "type": "positionalArgument",
      },
      {
        "index": 16,
        "raw": "src/example/app.ts",
        "type": "positionalArgument",
      },
      {
        "index": 35,
        "raw": "cat",
        "type": "positionalArgument",
      },
      {
        "index": 39,
        "raw": "/tmp/a",
        "type": "positionalArgument",
      },
      {
        "index": 46,
        "key": "help",
        "raw": "--help",
        "type": "longOption",
        "value": undefined,
      },
    ]
  `);
});
