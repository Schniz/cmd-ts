import * as c from "../src";
import { ArgvItem } from "../src/argparser2";
import { describe, expect, test } from "vitest";

describe("command", () => {
	test("parses an empty args array", async () => {
		const value = await c
			.command({ name: "cmd", args: {}, handler() {} })
			.parse2([]);
	});
});
