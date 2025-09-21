#!/usr/bin/env YARN_SILENT=1 yarn ts-node

import { command, flag, run } from "../src";

const app = command({
	name: "flag-onmissing-demo",
	args: {
		verbose: flag({
			long: "verbose",
			short: "v",
			description: "Enable verbose output",
			onMissing: () => {
				console.log("🤔 Verbose flag not provided, checking environment...");
				return process.env.NODE_ENV === "development";
			},
		}),
		debug: flag({
			long: "debug",
			short: "d",
			description: "Enable debug mode",
			onMissing: async () => {
				console.log("🔍 Debug flag missing, simulating config check...");
				await new Promise((resolve) => setTimeout(resolve, 100));
				return Math.random() > 0.5; // Simulate config-based decision
			},
		}),
		force: flag({
			long: "force",
			short: "f",
			description: "Force operation without confirmation",
			onMissing: () => {
				console.log("⚠️  Force flag not set, would normally prompt user...");
				// In real scenario: return prompt("Force operation? (y/n)") === "y"
				return false; // Safe default for demo
			},
		}),
	},
	handler: ({ verbose, debug, force }) => {
		console.log("\n📋 Results:");
		console.log(`  Verbose: ${verbose ? "✅" : "❌"}`);
		console.log(`  Debug: ${debug ? "✅" : "❌"}`);
		console.log(`  Force: ${force ? "✅" : "❌"}`);
	},
});

run(app, process.argv.slice(2));
