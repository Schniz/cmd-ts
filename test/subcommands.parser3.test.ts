import * as c from "../src";
import { parse, ArgvItem, ParsingError } from "../src/argparser3";
import { expect, test } from "vitest";
import { Help, Version } from "../src/effects";

const command = c.command({ name: "command", args: {}, handler() {} });

test("parses subcommand 'a'", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const parsed = await parse(
		subcommands.parser3,
		ArgvItem.normalize(["a", "world"]),
	);
	expect(parsed).toEqual({
		errors: [],
		remainingArgv: [{ value: "world", index: 1 }],
		result: { value: "a" },
	});
});

test("parses subcommand 'b'", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const parsed = await parse(
		subcommands.parser3,
		ArgvItem.normalize(["b", "world"]),
	);
	expect(parsed).toEqual({
		errors: [],
		remainingArgv: [{ value: "world", index: 1 }],
		result: { value: "b" },
	});
});

test("handles invalid subcommand", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const parsed = await parse(
		subcommands.parser3,
		ArgvItem.normalize(["c", "world"]),
	);
	expect(parsed).toEqual({
		errors: [
			{
				argv: { index: 0, value: "c" },
				cause: new Error("Not a valid subcommand name"),
			},
		],
		remainingArgv: [{ value: "world", index: 1 }],
		result: null,
	});
});

test("requires a value", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const parsed = await parse(subcommands.parser3, ArgvItem.normalize([]));
	expect(parsed).toEqual({
		errors: [
			{
				argv: "unknown",
				cause: new Error("No value provided for subcommand"),
			},
		],
		remainingArgv: [],
		result: null,
	});
});

test("returns help", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const parsed = await parse(
		subcommands.parser3,
		ArgvItem.normalize(["--help"]),
	);

	expect(parsed).toEqual({
		errors: [],
		remainingArgv: [],
		result: { value: Help },
	});
});

test("errors for --version if version not provided", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const argv = ArgvItem.normalize(["--version"]);

	const parsed = await parse(subcommands.parser3, argv);

	expect(parsed).toEqual({
		errors: [
			ParsingError.make(argv[0], new Error("Not a valid subcommand name")),
		],
		remainingArgv: [],
		result: null,
	});
});

test("returns version", async () => {
	const subcommands = c.subcommands({
		version: "1.0.0",
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	const argv = ArgvItem.normalize(["--version"]);

	const parsed = await parse(subcommands.parser3, argv);

	expect(parsed).toEqual({
		errors: [],
		remainingArgv: [],
		result: { value: Version },
	});
});
