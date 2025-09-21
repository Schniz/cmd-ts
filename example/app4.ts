#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import { command, extendType, option, run, string } from "../src";

const AsyncType = extendType(string, {
	async from(str) {
		return str;
	},
	onMissing: () => Promise.resolve("default value"),
	description: "A type with onMissing callback",
});

const app = command({
	name: "async-test",
	args: {
		asyncArg: option({
			type: AsyncType,
			long: "async-arg",
			short: "a",
		}),
		asyncArg2: option({
			long: "async-arg-2",
			type: AsyncType,
			defaultValue: () => "Hi",
			defaultValueIsSerializable: true,
		}),
		arg3: option({
			long: "async-arg-3",
			type: string,
			onMissing: () => "Hello from opt",
		}),
	},
	handler: ({ asyncArg, asyncArg2, arg3 }) => {
		console.log(`Result: ${asyncArg}, ${asyncArg2}, ${arg3}`);
	},
});

run(app, process.argv.slice(2));
