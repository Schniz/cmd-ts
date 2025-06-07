import path from "node:path";
import { describe, expect, test } from "vitest";
import { app } from "./util";

test("help for subcommands", async () => {
	const result = await runApp1(["--help"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("invalid subcommand", async () => {
	const result = await runApp1(["subcommand-that-doesnt-exist"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("help for complex command", async () => {
	const result = await runApp1(["complex", "--help"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("too many arguments", async () => {
	const result = await runApp1([
		"--this=will-be-an-error",
		"cat",
		path.relative(process.cwd(), path.join(__dirname, "../package.json")),
		"--and-also-this",
	]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("suggests a subcommand on typo", async () => {
	const result = await runApp1(["greek"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("displays subcommand help if no arguments passed", async () => {
	const result = await runApp1([]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("displays nested subcommand help if no arguments passed", async () => {
	const result = await runApp1(["composed"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("composes errors", async () => {
	const result = await runApp1([
		"greet",
		"--times=not-a-number",
		"not-capitalized",
	]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("multiline error", async () => {
	const result = await runApp1(["greet", "Bon Jovi"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("help for composed subcommands", async () => {
	const result = await runApp1(["composed", "--help"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("help for composed subcommand", async () => {
	const result = await runApp1(["composed", "cat", "--help"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("asynchronous type conversion works for failures", async () => {
	const result = await runApp1(["composed", "cat", "https://httpstat.us/404"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("asynchronous type conversion works for success", async () => {
	const result = await runApp1(["composed", "cat", "https://httpstat.us/200"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(0);
});

test("subcommands show their version", async () => {
	const result = await runApp1(["--version"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(0);
});

test("failures in defaultValue", async () => {
	const result = await runApp2([]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

test("subcommands with process.argv.slice(2)", async () => {
	const result = await runApp3(["--help"]);
	expect(result.all).toMatchSnapshot();
	expect(result.exitCode).toBe(1);
});

describe("allows positional arguments", () => {
	test("help shows them", async () => {
		const result = await runApp3(["sub2", "--help"]);
		expect(result.all).toMatchSnapshot();
		expect(result.exitCode).toBe(1);
	});

	test("no positionals => all default", async () => {
		const result = await runApp3(["sub2"]);
		expect(result.all).toMatchInlineSnapshot(
			`"{ name: 'anonymous', age: undefined }"`,
		);
		expect(result.exitCode).toBe(0);
	});

	test("expects the correct order", async () => {
		// should fail because we get an age first and `hello` is not a number
		const result = await runApp3(["sub2", "hello"]);
		expect(result.all).toMatchSnapshot();
		expect(result.exitCode).toBe(1);
	});

	test("can take all the arguments", async () => {
		// should fail because we get an age first and `hello` is not a number
		const result = await runApp3(["sub2", "10", "ben"]);
		expect(result.all).toMatchInlineSnapshot(`"{ name: 'ben', age: 10 }"`);
		expect(result.exitCode).toBe(0);
	});
});

const runApp1 = app(path.join(__dirname, "../example/app.ts"));
const runApp2 = app(path.join(__dirname, "../example/app2.ts"));
const runApp3 = app(path.join(__dirname, "../example/app3.ts"));
