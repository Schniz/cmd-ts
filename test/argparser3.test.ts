import { describe, expect, test } from "vitest";
import {
	ArgvItem,
	type ParseResult,
	Parser,
	all,
	createFlag,
	createRequiredParam,
} from "../src/argparser3";

async function parse<T>(
	parser: Parser<T>,
	argv: ArgvItem[],
	opts?: { signal: AbortSignal },
): Promise<ParseResult<T>> {
	argv = [...argv];
	const gen = parser.gen();
	let state: Parser.IterResult<T> | undefined = undefined;
	let times = 0;

	while (!opts?.signal.aborted) {
		times++;
		if (times > 1000) {
			throw new Error("Infinite loop detected in parser");
		}

		state = await gen.next(["continue", argv.length > 0]);

		let found = false;
		let looking = true;
		let inner = 0;

		while (looking) {
			const { value, done } = state;
			if (done) {
				return { result: { value }, errors: [], remainingArgv: argv };
			}

			if (inner++ > 100) {
				throw new Error("Infinite loop detected in parser");
			}

			switch (value.key) {
				case "continue": {
					looking = false;
					break;
				}
				case "consume": {
					const removed = argv.splice(0, value.payload[0]);
					state = await gen.next(["consume", removed]);
					found = true;
					break;
				}
				case "peek": {
					state = await gen.next(["peek", argv.slice(0, value.payload[0])]);
					break;
				}
				case "break": {
					return { errors: value.payload, result: null, remainingArgv: argv };
				}
			}
		}

		if (!looking && !found && argv.length && times > 2) {
			// No progress made for several iterations, return remaining argv
			return {
				errors: [],
				result: null,
				remainingArgv: argv,
			};
		}
	}

	// If we exit the loop (e.g., due to signal abort), return remaining argv
	return {
		errors: [],
		result: null,
		remainingArgv: argv,
	};
}

describe("createRequiredParam with all combinator", () => {
	test("combines multiple required parameters successfully", async () => {
		const parser = all([
			createRequiredParam("first-name"),
			createRequiredParam("last-name"),
		]);
		
		const result = await parse(parser, ArgvItem.normalize([
			"--first-name=John",
			"--last-name=Doe"
		]));
		
		expect(result).toEqual({
			errors: [],
			result: { value: ["John", "Doe"] },
			remainingArgv: [],
		});
	});

	test("combines errors when multiple required parameters are missing", async () => {
		const parser = all([
			createRequiredParam("first-name"),
			createRequiredParam("last-name"),
		]);
		
		const result = await parse(parser, ArgvItem.normalize([]));
		
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0].cause.message).toBe("Required parameter --first-name is missing");
		expect(result.errors[1].cause.message).toBe("Required parameter --last-name is missing");
		expect(result.result).toBe(null);
		expect(result.remainingArgv).toEqual([]);
	});

	test("combines errors when some required parameters are missing", async () => {
		const parser = all([
			createRequiredParam("first-name"),
			createRequiredParam("last-name"),
			createRequiredParam("email"),
		]);
		
		const result = await parse(parser, ArgvItem.normalize([
			"--first-name=John",
			"--other=value"
		]));
		
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0].cause.message).toBe("Required parameter --last-name is missing");
		expect(result.errors[1].cause.message).toBe("Required parameter --email is missing");
		expect(result.result).toBe(null);
		expect(result.remainingArgv).toEqual(ArgvItem.normalize(["--other=value"]));
	});

	test("mixes required parameters with flags", async () => {
		const parser = all([
			createRequiredParam("name"),
			createFlag("verbose"),
			createRequiredParam("output"),
		]);
		
		const result = await parse(parser, ArgvItem.normalize([
			"--verbose",
			"--name=test",
			"--output=file.txt"
		]));
		
		expect(result).toEqual({
			errors: [],
			result: { value: ["test", true, "file.txt"] },
			remainingArgv: [],
		});
	});

	test("combines errors from mixed required parameters and flags", async () => {
		const parser = all([
			createRequiredParam("name"),
			createFlag("verbose"),
			createRequiredParam("output"),
		]);
		
		const result = await parse(parser, ArgvItem.normalize([
			"--verbose",
			"--unknown=value"
		]));
		
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0].cause.message).toBe("Required parameter --name is missing");
		expect(result.errors[1].cause.message).toBe("Required parameter --output is missing");
		expect(result.result).toBe(null);
		expect(result.remainingArgv).toEqual(ArgvItem.normalize(["--unknown=value"]));
	});
});