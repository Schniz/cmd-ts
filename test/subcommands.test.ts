import { expect, test, vitest } from "vitest";
import * as Result from "../src/Result";
import { command } from "../src/command";
import { flag } from "../src/flag";
import { parse } from "../src/newparser/parser";
import { tokenize } from "../src/newparser/tokenizer";
import { option } from "../src/option";
import { positional } from "../src/positional";
import { subcommands } from "../src/subcommands";
import { createRegisterOptions } from "./createRegisterOptions";
import { boolean, string } from "./test-types";

const logMock = vitest.fn();

const greeter = command({
	name: "greeter",
	args: {
		name: positional({ type: string, displayName: "name" }),
		exclaim: flag({ type: boolean, long: "exclaim", short: "e" }),
		greeting: option({ type: string, long: "greeting", short: "g" }),
	},
	handler: (x) => {
		logMock("greeter", x);
	},
});

const howdyPrinter = command({
	name: "howdy",
	args: {
		name: positional({ type: string, displayName: "name" }),
	},
	handler: (x) => {
		logMock("howdy", x);
	},
});

const subcmds = subcommands({
	name: "my-cli",
	cmds: {
		greeter,
		howdy: howdyPrinter,
	},
});

test("chooses one subcommand", async () => {
	const argv = "greeter Gal -eg Hello".split(" ");
	const tokens = tokenize(argv);
	const registerOptions = createRegisterOptions();
	subcmds.register(registerOptions);
	const nodes = parse(tokens, registerOptions);
	const result = await subcmds.parse({ nodes, visitedNodes: new Set() });
	const expected: typeof result = Result.ok({
		args: {
			name: "Gal",
			exclaim: true,
			greeting: "Hello",
		},
		command: "greeter",
	});

	expect(result).toEqual(expected);
});

test("chooses the other subcommand", async () => {
	const argv = "howdy joe".split(" ");
	const tokens = tokenize(argv);
	const registerOptions = createRegisterOptions();
	subcmds.register(registerOptions);
	const nodes = parse(tokens, registerOptions);
	const result = await subcmds.parse({ nodes, visitedNodes: new Set() });
	const expected: typeof result = Result.ok({
		command: "howdy",
		args: {
			name: "joe",
		},
	});

	expect(result).toEqual(expected);
});

test("fails when using unknown subcommand", async () => {
	const argv = "--hello yes how are you joe".split(" ");
	const tokens = tokenize(argv);
	const registerOptions = createRegisterOptions();
	subcmds.register(registerOptions);
	const nodes = parse(tokens, registerOptions);
	const result = await subcmds.parse({ nodes, visitedNodes: new Set() });
	const expected: typeof result = Result.err({
		errors: [
			{
				nodes: nodes.filter((x) => x.raw === "how"),
				message: "Not a valid subcommand name",
			},
		],
		partialValue: {},
	});

	expect(result).toEqual(expected);
});

test("fails for a subcommand argument parsing issue", async () => {
	const argv = "greeter Gal -g Hello --exclaim=hell-no".split(" ");
	const tokens = tokenize(argv);
	const registerOptions = createRegisterOptions();
	subcmds.register(registerOptions);
	const nodes = parse(tokens, registerOptions);
	const result = await subcmds.parse({ nodes, visitedNodes: new Set() });
	const expected = Result.err({
		errors: [
			{
				nodes: nodes.filter((x) => x.raw.includes("hell-no")),
				message: `expected value to be either "true" or "false". got: "hell-no"`,
			},
		],
		partialValue: {
			command: "greeter",
			args: {
				greeting: "Hello",
				name: "Gal",
			},
		},
	});

	expect(result).toEqual(expected);
});
