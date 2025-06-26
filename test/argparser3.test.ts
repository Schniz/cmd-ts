import {
	parse,
	createFlag,
	ArgvItem,
	createMultiFlag,
	createRequiredFlag,
	all,
	ParsingError,
	UnmatchedInput,
	Parser,
	effects,
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

	test("with unmatched arguments (default skipAndCollect)", async () => {
		const argv = ArgvItem.normalize(["--verbose", "--unmatched", "--debug"]);
		const parser = all([createFlag("verbose"), createFlag("debug")]);
		const value = await parse(parser, argv);

		// Default behavior: should succeed and skip unmatched argument
		expect(value).toEqual<typeof value>({
			result: { value: [true, true] },
			remainingArgv: [argv[1]], // --unmatched should be in remaining
			errors: [],
		});
	});

	test("with unmatched arguments (failEarly)", async () => {
		const argv = ArgvItem.normalize(["--verbose", "--unmatched", "--debug"]);
		const parser = all([createFlag("verbose"), createFlag("debug")]);
		const value = await parse(parser, argv, {
			unmatchedInput: "failEarly",
		});

		// All-or-nothing: should fail because of unmatched argument
		expect(value).toEqual<typeof value>({
			result: null,
			remainingArgv: [argv[1]], // Only --unmatched should remain
			errors: [
				ParsingError.make(
					argv[1],
					new UnmatchedInput(
						argv[1],
						"Unmatched argument: --unmatched. No parser can handle this argument.",
					),
				),
			],
		});
	});

	test("with unmatched arguments (explicit skipAndCollect)", async () => {
		const argv = ArgvItem.normalize([
			"--verbose",
			"--unmatched",
			"--debug",
			"--another-unmatched",
		]);
		const parser = all([createFlag("verbose"), createFlag("debug")]);
		const value = await parse(parser, argv);

		// Should succeed and skip both unmatched arguments
		expect(value).toEqual<typeof value>({
			result: { value: [true, true] },
			remainingArgv: [argv[1], argv[3]], // both unmatched args should be in remaining
			errors: [],
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

	test("errors are marked to the specific consumed elements", async () => {
		const failing = new Parser<never>(async function* () {
			const [arg] = yield* effects.consume(1);
			throw new Error(`i don't like ${arg.value}`);
		});

		{
			const argv = ArgvItem.normalize(["--verbose"]);
			const result = await parse(failing, argv);
			expect(result).toEqual<typeof result>({
				result: null,
				remainingArgv: [],
				errors: [
					ParsingError.make(argv[0], new Error("i don't like --verbose")),
				],
			});
		}

		{
			const parser = all([createFlag("verbose"), failing]);
			const argv = ArgvItem.normalize(["--verbose", "--unmatched"]);
			const result = await parse(parser, argv);

			expect(result).toEqual({
				result: null,
				remainingArgv: [],
				errors: [
					ParsingError.make(argv[1], new Error("i don't like --unmatched")),
				],
			});
		}
	});

	describe("use `all` in a custom parser", () => {
		const one = createFlag("one");
		const two = createFlag("two");
		const xor = new Parser<"one" | "two">(async function* () {
			const [vone, vtwo] = yield* all([one, two]);
			if (vone && vtwo) {
				throw new Error("Cannot use both --one and --two together");
			}
			if (!vone && !vtwo) {
				throw new Error("Must use either --one or --two");
			}

			return vone ? "one" : "two";
		});

		test("one + two", async () => {
			const argv = ArgvItem.normalize(["--one", "--two"]);
			const result = await parse(xor, argv);
			expect(result).toEqual<typeof result>({
				result: null,
				remainingArgv: [],
				errors: [
					ParsingError.make(
						argv[0],
						new Error("Cannot use both --one and --two together"),
					),
					ParsingError.make(
						argv[1],
						new Error("Cannot use both --one and --two together"),
					),
				],
			});
		});

		test("!one + !two", async () => {
			const argv = ArgvItem.normalize([]);
			const result = await parse(xor, argv);
			expect(result).toEqual<typeof result>({
				result: null,
				remainingArgv: [],
				errors: [
					ParsingError.forUnknownArgv(
						new Error("Must use either --one or --two"),
					),
				],
			});
		});

		test("!one + !two + unmatched", async () => {
			const argv = ArgvItem.normalize(["--unmatched", "value"]);
			const result = await parse(xor, argv);
			expect(result).toEqual<typeof result>({
				result: null,
				remainingArgv: argv,
				errors: [
					ParsingError.forUnknownArgv(
						new Error("Must use either --one or --two"),
					),
				],
			});
		});

		test("one", async () => {
			const argv = ArgvItem.normalize(["--one"]);
			const result = await parse(xor, argv);
			expect(result).toEqual<typeof result>({
				result: { value: "one" },
				remainingArgv: [],
				errors: [],
			});
		});

		test("two", async () => {
			const argv = ArgvItem.normalize(["--two"]);
			const result = await parse(xor, argv);
			expect(result).toEqual<typeof result>({
				result: { value: "two" },
				remainingArgv: [],
				errors: [],
			});
		});
	});
});
