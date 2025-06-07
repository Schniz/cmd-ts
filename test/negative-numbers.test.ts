import { expect, test } from "vitest";
import { createCmd } from "../example/negative-numbers";
import { runSafely } from "../src";

test("negative numbers", async () => {
	const cmd = createCmd();
	const result = new Promise<number>((resolve) => {
		cmd.handler = async ({ number }) => {
			resolve(number);
		};
	});

	const runResult = await runSafely(cmd, ["--number", "-10"]);
	if (runResult._tag === "error") {
		throw runResult.error;
	}

	expect(await result).toEqual(-10);
});
