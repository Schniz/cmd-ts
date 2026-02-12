import { afterEach, describe, expect, test } from "vitest";
import {
	command,
	flag,
	positional,
	resetHelpFormatter,
	run,
	setDefaultHelpFormatter,
	subcommands,
} from "../src";
import {
	createVercelFormatter,
	vercelFormatter,
} from "../src/batteries/vercel-formatter";

describe("vercelFormatter", () => {
	afterEach(() => {
		resetHelpFormatter();
	});

	test("formats subcommands help with version and logo", async () => {
		setDefaultHelpFormatter(
			createVercelFormatter({
				cliName: "Vercel Sandbox CLI",
				logo: "▲",
			}),
		);

		const create = command({
			name: "create",
			description: "Create a new sandbox",
			args: {
				connect: flag({
					long: "connect",
					short: "c",
					description: "Connect after creating",
				}),
			},
			handler: () => {},
		});

		const list = command({
			name: "list",
			aliases: ["ls"],
			description: "List sandboxes for the current project",
			args: {},
			handler: () => {},
		});

		const runCmd = command({
			name: "run",
			description: "Create and run a command in a sandbox",
			args: {
				cmd: positional({ displayName: "cmd", description: "Command to run" }),
			},
			handler: () => {},
		});

		const stop = command({
			name: "stop",
			aliases: ["rm"],
			description: "Stop one or more running sandboxes",
			args: {
				ids: positional({ displayName: "id...", description: "Sandbox IDs" }),
			},
			handler: () => {},
		});

		const copy = command({
			name: "copy",
			aliases: ["cp"],
			description: "Copy files between local and remote",
			args: {
				src: positional({ displayName: "src", description: "Source path" }),
				dst: positional({
					displayName: "dst",
					description: "Destination path",
				}),
			},
			handler: () => {},
		});

		const app = subcommands({
			name: "sandbox",
			version: "2.3.0",
			description: "Interfacing with Vercel Sandbox",
			cmds: { create, list, run: runCmd, stop, copy },
			examples: [
				{
					description: "Create a sandbox and start a shell",
					command: "sandbox create --connect",
				},
				{
					description: "Run a command in a new sandbox",
					command: "sandbox run -- node -e \"console.log('hello')\"",
				},
			],
		});

		let output = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			output = msg;
		};

		try {
			await run(app, ["--help"]);
		} catch {
			// run throws Exit
		}

		console.log = originalLog;

		expect(output).toMatchSnapshot();
	});

	test("formats command help", async () => {
		setDefaultHelpFormatter(vercelFormatter);

		const create = command({
			name: "create",
			version: "1.0.0",
			description: "Create a new sandbox",
			args: {
				connect: flag({
					long: "connect",
					short: "c",
					description: "Connect to the sandbox after creating",
				}),
				name: positional({
					displayName: "name",
					description: "Name for the sandbox",
				}),
			},
			handler: () => {},
			examples: [
				{
					description: "Create a sandbox named 'dev'",
					command: "create dev",
				},
				{
					description: "Create and connect",
					command: "create dev --connect",
				},
			],
		});

		let output = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			output = msg;
		};

		try {
			await run(create, ["--help"]);
		} catch {
			// run throws Exit
		}

		console.log = originalLog;

		expect(output).toMatchSnapshot();
	});

	test("shows aliases as short | long format", async () => {
		setDefaultHelpFormatter(vercelFormatter);

		const list = command({
			name: "list",
			aliases: ["ls", "l"],
			description: "List items",
			args: {},
			handler: () => {},
		});

		const app = subcommands({
			name: "app",
			cmds: { list },
		});

		let output = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			output = msg;
		};

		try {
			await run(app, ["--help"]);
		} catch {
			// run throws Exit
		}

		console.log = originalLog;

		// Should show "l | list" (shortest alias first)
		expect(output).toContain("l | list");
	});

	test("derives argument hints from help topics", async () => {
		setDefaultHelpFormatter(vercelFormatter);

		const exec = command({
			name: "exec",
			description: "Execute a command",
			args: {
				id: positional({ displayName: "id", description: "Sandbox ID" }),
				cmd: positional({ displayName: "cmd", description: "Command" }),
			},
			handler: () => {},
		});

		const app = subcommands({
			name: "app",
			cmds: { exec },
		});

		let output = "";
		const originalLog = console.log;
		console.log = (msg: string) => {
			output = msg;
		};

		try {
			await run(app, ["--help"]);
		} catch {
			// run throws Exit
		}

		console.log = originalLog;

		// Should show argument hints derived from positionals
		expect(output).toContain("<id>");
		expect(output).toContain("<cmd>");
	});
});
