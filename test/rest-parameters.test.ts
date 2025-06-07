import { it, expect } from "vitest";
import path from "path";
import { app } from "./util";

const runAppRestExample = app(
	path.join(__dirname, "../example/rest-example.ts"),
);

it("should be able to use rest parameters after the positional", async () => {
	const result = await runAppRestExample([
		"pos",
		"more",
		"--rest",
		"parameters",
	]);
	expect(JSON.parse(result.stdout)).toEqual({
		scriptName: "pos",
		everythingElse: ["more", "--rest parameters"],
		//                       ^ this is weird, but it's the way it is.
	});
});

it("should fail if the positional is not provided", async () => {
	const result = await runAppRestExample(["--rest", "parameters"]);
	expect(result.exitCode).toBe(1);
	expect(result.stderr).toContain("No value provided for str");
});
