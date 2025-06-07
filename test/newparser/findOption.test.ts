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
