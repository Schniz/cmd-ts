import {
	parse,
	createFlag,
	ArgvItem,
	createMultiFlag,
	createRequiredFlag,
	all,
	ParsingError,
} from "../src/argparser3";
import { describe, test, expect } from "vitest";

describe("single parser: flag", () => {
	test("parse nothing", async () => {
		const value = await parse(createFlag("missing"), []);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: false },
		});
	});

	test("unmatched", async () => {
		const argv = ArgvItem.normalize(["--unmatched"]);
		const value = await parse(createFlag("missing"), argv);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [argv[0]],
			result: { value: false },
		});
	});

	test("matched", async () => {
		const argv = ArgvItem.normalize(["--test"]);
		const value = await parse(createFlag("test"), argv);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: true },
		});
	});
});

describe("single parser: multiflag", () => {
	test("parse nothing", async () => {
		const value = await parse(createMultiFlag("missing"), []);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: 0 },
		});
	});

	test("unmatched", async () => {
		const argv = ArgvItem.normalize(["--unmatched"]);
		const value = await parse(createMultiFlag("missing"), argv);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [argv[0]],
			result: { value: 0 },
		});
	});

	test("matched", async () => {
		const argv = ArgvItem.normalize(["--test"]);
		const value = await parse(createMultiFlag("test"), argv);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: 1 },
		});
	});

	test("matching multiple times", async () => {
		const argv = ArgvItem.normalize([
			"--test",
			"--test",
			"--test",
			"--unmatched",
		]);
		const value = await parse(createMultiFlag("test"), argv);
		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [argv[3]],
			result: { value: 3 },
		});
	});
});

describe("combinator: all", () => {
	test("all parsers succeed", async () => {
		const argv = ArgvItem.normalize(["--verbose", "--debug"]);
		const parser = all([createFlag("verbose"), createFlag("debug")]);
		const value = await parse(parser, argv);

		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: [true, true] },
		});
	});

	test("some parsers succeed, some fail", async () => {
		const argv = ArgvItem.normalize(["--verbose"]);
		const parser = all([createFlag("verbose"), createFlag("missing")]);
		const value = await parse(parser, argv);

		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: [true, false] },
		});
	});

	test("mixed parser types", async () => {
		const argv = ArgvItem.normalize([
			"--count",
			"--verbose",
			"--count",
			"--count",
		]);
		const parser = all([createFlag("verbose"), createMultiFlag("count")]);
		const value = await parse(parser, argv);

		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [],
			result: { value: [true, 3] },
		});
	});

	test.only("with unmatched arguments", async () => {
		const argv = ArgvItem.normalize(["--verbose", "--unmatched", "--debug"]);
		const parser = all([createFlag("verbose"), createFlag("debug")]);
		const value = await parse(parser, argv);

		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [argv[1]], // --unmatched should remain
			result: { value: [true, true] },
		});
	});

	test("empty parser array", async () => {
		const argv = ArgvItem.normalize(["--anything"]);
		const parser = all([]);
		const value = await parse(parser, argv);

		expect(value).toEqual<typeof value>({
			errors: [],
			remainingArgv: [argv[0]],
			result: { value: [] },
		});
	});

	test("type inference works correctly", async () => {
		const argv = ArgvItem.normalize(["--verbose", "--count", "--count"]);
		const parser = all([
			createFlag("verbose"),
			createMultiFlag("count"),
		] as const);
		const value = await parse(parser, argv);

		if (value.result) {
			// TypeScript should infer this as [boolean, number]
			const [verbose, count] = value.result.value;
			expect(typeof verbose).toBe("boolean");
			expect(typeof count).toBe("number");
			expect(verbose).toBe(true);
			expect(count).toBe(2);
		}
	});

	test("fails when any parser has errors", async () => {
		const argv = ArgvItem.normalize([]);
		const parser = all([createFlag("verbose"), createRequiredFlag("name")]);
		const value = await parse(parser, argv);

		expect(value).toEqual<typeof value>({
			errors: [
				ParsingError.forUnknownArgv(new Error("Missing value for --name")),
			],
			result: null,
			remainingArgv: [],
		});
	});
});
