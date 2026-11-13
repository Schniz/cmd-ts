import { expect, test } from "vitest";
import { findOption } from "../../src/newparser/findOption";
import { parse } from "../../src/newparser/parser";
import { tokenize } from "../../src/newparser/tokenizer";
import { createRegisterOptions } from "../createRegisterOptions";

test("finds options", () => {
	const argv = "hello world --some arg --flag --this-is=option -abcde=f -abcde";
	const tokens = tokenize(argv.split(" "));
	const nodes = parse(tokens, createRegisterOptions());

	const options = findOption(nodes, { longNames: ["some"], shortNames: ["c"] });

	const raw = options.map((x) => ({ key: x.key, value: x.value?.node.raw }));
	expect(raw).toEqual([
		{ key: "some", value: "arg" },
		{ key: "c" },
		{ key: "c" },
	]);
});

test.each<[string[], string[], string[]]>([
	[[], [], []],
	[["flag"], [], ["flag", "flag"]],
	[[], ["a"], ["a", "a"]],
	[
		["missing", "flag"],
		["b", "a"],
		["flag", "a", "b", "a", "flag"],
	],
	[
		["flag", "flag", "some"],
		["a", "a"],
		["flag", "some", "a", "a", "flag"],
	],
	[[""], [], [""]],
])("keeps matches in AST order: %j, %j", (longNames, shortNames, expected) => {
	const nodes = parse(
		tokenize(["--flag", "--some=x", "-aba", "--flag", "--=x"]),
		createRegisterOptions(),
	);
	const options = findOption(nodes, { longNames, shortNames });
	expect(options.map((option) => option.key)).toEqual(expected);
	if (longNames.includes("flag")) expect(options[0]).toBe(nodes[0]);
});

test("does not cache stale node keys or name lists", () => {
	const nodes = parse(tokenize(["--flag"]), createRegisterOptions());
	const names = { longNames: ["flag"], shortNames: [] };
	expect(findOption(nodes, names)).toEqual([nodes[0]]);
	if (nodes[0].type !== "longOption") throw new Error("expected long option");
	nodes[0].key = "renamed";
	expect(findOption(nodes, names)).toEqual([]);
	names.longNames[0] = "renamed";
	expect(findOption(nodes, names)).toEqual([nodes[0]]);
});
