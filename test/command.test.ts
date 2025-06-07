import { expect, test } from "vitest";
import * as Result from "../src/Result";
import { command } from "../src/command";
import { flag } from "../src/flag";
import { parse } from "../src/newparser/parser";
import { tokenize } from "../src/newparser/tokenizer";
import { option } from "../src/option";
import { restPositionals } from "../src/restPositionals";
import { createRegisterOptions } from "./createRegisterOptions";
import { boolean, number, string } from "./test-types";

const cmd = command({
	name: "My command",
	args: {
		positionals: restPositionals({ type: string }),
		option: option({ type: number, long: "option" }),
		secondOption: option({
			type: string,
			long: "second-option",
		}),
		flag: flag({ type: boolean, long: "flag" }),
	},
	handler: (_) => {},
});

test("merges options, positionals and flags", async () => {
	const argv =
		`first --option=666 second --second-option works-too --flag third`.split(
			" ",
		);
	const tokens = tokenize(argv);

	const registerOptions = createRegisterOptions();
	cmd.register(registerOptions);

	const nodes = parse(tokens, registerOptions);
	const result = await cmd.parse({ nodes, visitedNodes: new Set() });
	const expected: typeof result = Result.ok({
		positionals: ["first", "second", "third"],
		option: 666,
		secondOption: "works-too",
		flag: true,
	});

	expect(result).toEqual(expected);
});

test("fails if an argument fail to parse", async () => {
	const argv =
		`first --option=hello second --second-option works-too --flag=fails-too third`.split(
			" ",
		);
	const tokens = tokenize(argv);

	const registerOptions = createRegisterOptions();

	cmd.register(registerOptions);

	const nodes = parse(tokens, registerOptions);
	const result = cmd.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(
		Result.err({
			errors: [
				{
					nodes: nodes.filter((x) => x.raw.startsWith("--option")),
					message: "Not a number",
				},
				{
					nodes: nodes.filter((x) => x.raw.startsWith("--flag")),
					message: `expected value to be either "true" or "false". got: "fails-too"`,
				},
			],
			partialValue: {
				positionals: ["first", "second", "third"],
				secondOption: "works-too",
			},
		}),
	);
});

test("fails if providing unknown arguments", async () => {
	const cmd = command({
		name: "my command",
		args: {
			positionals: restPositionals({ type: string }),
		},
		handler: (_) => {},
	});
	const argv = `okay --option=failing alright --another=fail`.split(" ");
	const tokens = tokenize(argv);

	const registerOptions = createRegisterOptions();
	cmd.register(registerOptions);

	const nodes = parse(tokens, registerOptions);
	const result = await cmd.parse({
		nodes,
		visitedNodes: new Set(),
	});

	expect(result).toEqual(
		Result.err({
			errors: [
				{
					message: "Unknown arguments",
					nodes: nodes.filter(
						(node) =>
							node.raw.startsWith("--option") ||
							node.raw.startsWith("--another"),
					),
				},
			],
			partialValue: {
				positionals: ["okay", "alright"],
			},
		}),
	);
});

test("should fail run when an async handler fails", async () => {
	const error = new Error("oops");
	const cmd = command({
		name: "my command",
		args: {},
		handler: async (_) => {
			throw error;
		},
	});

	await expect(
		cmd.run({
			nodes: [],
			visitedNodes: new Set(),
		}),
	).rejects.toEqual(error);
});

test("succeeds when rest is quoted", async () => {
	// since spliting this by space doesn't give us the expected result, I just built the array myself
	// const argv = `--option=666 --second-option works-too positional -- "--restPositionals --trailing-comma all {{scripts,src}/**/*.{js,ts},{scripts,src}/*.{js,ts},*.{js,ts}}"`;
	const tokens = tokenize([
		"--option=666",
		"--second-option",
		"works-too",
		"positional",
		"--",
		"--restPositionals --trailing-comma all {{scripts,src}/**/*.{js,ts},{scripts,src}/*.{js,ts},*.{js,ts}}",
	]);
	const registerOptions = createRegisterOptions();
	cmd.register(registerOptions);
	const nodes = parse(tokens, registerOptions);
	const result = cmd.parse({
		nodes,
		visitedNodes: new Set(),
	});

	await expect(result).resolves.toEqual(
		Result.ok({
			positionals: [
				"positional",
				"--restPositionals --trailing-comma all {{scripts,src}/**/*.{js,ts},{scripts,src}/*.{js,ts},*.{js,ts}}",
			],
			option: 666,
			secondOption: "works-too",
			flag: false,
		}),
	);
});
