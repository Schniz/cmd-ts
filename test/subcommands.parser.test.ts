import * as c from "../src";
import { ArgvItem } from "../src/argparser2";
import { expect, test } from "vitest";

const command = c.command({ name: "command", args: {}, handler() {} });

test("parses a subcommand", async () => {
	const subcommands = c.subcommands({
		name: "test",
		cmds: {
			a: command,
			b: command,
		},
	});

	{
		const parse = await subcommands.parse2(ArgvItem.normalize(["a", "world"]));
		expect(parse).toEqual({
			errors: [],
			remainingArgv: [{ value: "world", index: 1 }],
			result: { value: "a" },
		});
	}

	{
		const parse = await subcommands.parse2(ArgvItem.normalize(["b", "world"]));
		expect(parse).toEqual({
			errors: [],
			remainingArgv: [{ value: "world", index: 1 }],
			result: { value: "b" },
		});
	}

	{
		const parse = await subcommands.parse2(ArgvItem.normalize(["c", "world"]));
		expect(parse).toEqual({
			errors: [
				{
					argv: { index: 0, value: "c" },
					cause: new Error("Not a valid subcommand name"),
					atomic: true,
				},
			],
			remainingArgv: [
				{ value: "c", index: 0 },
				{ value: "world", index: 1 },
			],
			result: null,
		});
	}
});
