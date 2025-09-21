#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import { command, extendType, option, run, string } from "../src";

const AsyncFailureType = extendType(string, {
	async from(str) {
		return str;
	},
	onMissing: () => Promise.reject(new Error("Async onMissing failed")),
	description: "A type with onMissing callback that fails",
});

const app = command({
	name: "async-test-failure",
	args: {
		failArg: option({
			type: AsyncFailureType,
			long: "fail-arg",
			short: "f",
		}),
	},
	handler: ({ failArg }) => {
		console.log(`Result: ${failArg}`);
	},
});

run(app, process.argv.slice(2));
