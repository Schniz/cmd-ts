#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import { command, multioption, run } from "../src";
import type { Type } from "../src/type";

// Create a simple string array type for multioption
const stringArray: Type<string[], string[]> = {
	async from(strings) {
		return strings;
	},
	displayName: "string",
};

const app = command({
	name: "multioption-onmissing-demo",
	args: {
		includes: multioption({
			long: "include",
			short: "i",
			type: stringArray,
			description: "Files to include in processing",
			onMissing: async () => {
				console.log("📁 No includes specified, discovering files...");
				await new Promise((resolve) => setTimeout(resolve, 100));
				// Simulate filesystem discovery
				return ["src/**/*.ts", "lib/**/*.js"];
			},
		}),
		targets: multioption({
			long: "target",
			short: "t",
			type: stringArray,
			description: "Build targets",
			onMissing: () => {
				console.log("🎯 No targets specified, using environment defaults...");
				return process.env.NODE_ENV === "production"
					? ["es2020", "node16"]
					: ["esnext", "node18"];
			},
		}),
		features: multioption({
			long: "feature",
			short: "f",
			type: stringArray,
			description: "Features to enable",
			onMissing: async () => {
				console.log("🚀 No features specified, checking available features...");
				await new Promise((resolve) => setTimeout(resolve, 150));
				const available = ["auth", "db", "api", "ui"];
				// Simulate interactive selection or config-based defaults
				return available.slice(0, 2); // Return first 2 as default
			},
		}),
	},
	handler: ({ includes, targets, features }) => {
		console.log("\n📋 Configuration:");
		console.log(`  Includes: [${includes.join(", ")}]`);
		console.log(`  Targets: [${targets.join(", ")}]`);
		console.log(`  Features: [${features.join(", ")}]`);
	},
});

run(app, process.argv.slice(2));
