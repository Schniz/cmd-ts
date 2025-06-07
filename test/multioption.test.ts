import { expect, test } from "vitest";
import { array, string } from "../src/types";
import { multioption } from "../src/multioption";
import { tokenize } from "../src/newparser/tokenizer";
import { createRegisterOptions } from "./createRegisterOptions";
import { parse } from "../src/newparser/parser";
import * as Result from "../src/Result";

test("applies default value when no option is provided", async () => {
	const argv = "";
	const tokens = tokenize(argv.split(" "));
	const argparser = multioption({
		type: array(string),
		long: "hello",
		defaultValue: () => ["world!"],
		description: "description",
	});
	const registerOptions = createRegisterOptions();
	argparser.register(registerOptions);
	const nodes = parse(tokens, registerOptions);

	const result = argparser.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(Result.ok(["world!"]));
});

test("does not apply default value when option is provided", async () => {
	const argv = "--hello=moshe";
	const tokens = tokenize(argv.split(" "));
	const argparser = multioption({
		type: array(string),
		long: "hello",
		defaultValue: () => ["world!"],
		description: "description",
	});
	const registerOptions = createRegisterOptions();
	argparser.register(registerOptions);
	const nodes = parse(tokens, registerOptions);

	const result = argparser.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(Result.ok(["moshe"]));
});

test("does not apply default value when options are provided", async () => {
	const argv = "--hello=moshe --hello=haim";
	const tokens = tokenize(argv.split(" "));
	const argparser = multioption({
		type: array(string),
		long: "hello",
		defaultValue: () => ["world!"],
		description: "description",
	});
	const registerOptions = createRegisterOptions();
	argparser.register(registerOptions);
	const nodes = parse(tokens, registerOptions);

	const result = argparser.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(Result.ok(["moshe", "haim"]));
});

test("fails when no option is provided and applying default value fails", async () => {
	const argv = "";
	const tokens = tokenize(argv.split(" "));
	const argparser = multioption({
		type: array(string),
		long: "hello",
		defaultValue: () => {
			throw new Error("its too hot outside, stay inside sweetheart!");
		},
		description: "description",
	});
	const registerOptions = createRegisterOptions();
	argparser.register(registerOptions);
	const nodes = parse(tokens, registerOptions);

	const result = argparser.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(
		Result.err({
			errors: [
				{
					nodes: [],
					message: `Failed to resolve default value for '--hello': its too hot outside, stay inside sweetheart!`,
				},
			],
		}),
	);
});

test("fallsback to `[]` when no options and no defaultValue are provided", async () => {
	const argv = "";
	const tokens = tokenize(argv.split(" "));
	const argparser = multioption({
		type: array(string),
		long: "hello",
		description: "description",
	});
	const registerOptions = createRegisterOptions();
	argparser.register(registerOptions);
	const nodes = parse(tokens, registerOptions);

	const result = argparser.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(Result.ok([]));
});
