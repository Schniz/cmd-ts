import {
	parse,
	createFlag,
	ArgvItem,
	createMultiFlag,
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
