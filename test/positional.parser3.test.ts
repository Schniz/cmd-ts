import * as c from "../src";
import { parse, ArgvItem, ParsingError } from "../src/argparser3";
import { expect, test } from "vitest";
import { exclaim } from "./test-types";

test("missing value", async () => {
	const value = await parse(
		c.positional({ displayName: "something" }).parser3,
		[],
	);
	expect(value).toEqual<typeof value>({
		result: null,
		remainingArgv: [],
		errors: [
			ParsingError.forUnknownArgv(
				new Error(`No value provided for "something"`),
			),
		],
	});
});

test("not reading -s or --arg", async () => {
	const argv = ArgvItem.normalize(["-s", "--hi", "hello"]);
	const value = await parse(
		c.positional({ displayName: "something" }).parser3,
		argv,
	);
	expect(value).toEqual<typeof value>({
		result: { value: "hello" },
		remainingArgv: [argv[0], argv[1]],
		errors: [],
	});
});

test("supports optionals", async () => {
	const argv = ArgvItem.normalize(["-s", "--hi"]);
	const value = await parse(
		c.positional({ displayName: "something", type: c.optional(c.string) })
			.parser3,
		argv,
	);
	expect(value).toEqual<typeof value>({
		result: { value: undefined },
		remainingArgv: [argv[0], argv[1]],
		errors: [],
	});
});

test("fails to parse", async () => {
	const argv = ArgvItem.normalize(["hello!"]);
	const value = await parse(
		c.positional({ displayName: "something", type: exclaim }).parser3,
		argv,
	);
	expect(value).toEqual<typeof value>({
		result: null,
		remainingArgv: [],
		errors: [
			ParsingError.make(argv[0], new Error(`Value should not end with '!'`)),
		],
	});
});

test("parses input", async () => {
	const argv = ArgvItem.normalize(["hello"]);
	const value = await parse(
		c.positional({ displayName: "something", type: exclaim }).parser3,
		argv,
	);
	expect(value).toEqual<typeof value>({
		result: { value: "hello!" },
		remainingArgv: [],
		errors: [],
	});
});
