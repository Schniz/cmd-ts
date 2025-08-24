import * as Result from "./Result";
import type { ArgParser, ParseContext, Register } from "./argparser";
import { Exit } from "./effects";
import { flag } from "./flag";
import type { PrintHelp, PrintVersion, ProvidesHelp, Versioned } from "./helpdoc";
import { boolean } from "./types";

export type CircuitBreaker = "help" | "version";

export const helpFlag = flag({
	long: "help",
	short: "h",
	type: boolean,
	description: "show help",
});

export const versionFlag = flag({
	long: "version",
	short: "v",
	type: boolean,
	description: "print the version",
});


export function handleCircuitBreaker(
	context: ParseContext,
	printer: PrintHelp & PrintVersion,
	breaker: Result.Result<any, CircuitBreaker>,
): void {
	if (Result.isErr(breaker)) {
		return;
	}

	if (breaker.value === "help") {
		throw new Exit(printer.printHelp(context));
	}
	if (breaker.value === "version") {
		throw new Exit(printer.printVersion(context))
	}
}

/**
 * Helper flags that are being used in `command` and `subcommands`:
 * `--help, -h` to show help
 * `--version, -v` to show the current version
 *
 * It is called circuitbreaker because if you have `--help` or `--version`
 * anywhere in your argument list, you'll see the version and the help for the closest command
 */
export function createCircuitBreaker(
	{
   printVersion,
 }: {
   printHelp: (context: ParseContext) => ExitWithPrint;
   printVersion?: (context: ParseContext) => ExitWithPrint;
 }

): ArgParser<CircuitBreaker> & ProvidesHelp & Register & PrintHelp & PrintVersion {
	return {
		printVersion,
		printHelp,
		register(opts) {
			helpFlag.register(opts);
			if (printVersion) {
				versionFlag.register(opts);
			}
		},
		helpTopics() {
			const helpTopics = helpFlag.helpTopics();
			if (printVersion) {
				helpTopics.push(...versionFlag.helpTopics());
			}
			return helpTopics;
		},
		async parse(context) {
			const help = await helpFlag.parse(context);
			const version = printVersion
				? await versionFlag.parse(context)
				: undefined;

			if (Result.isErr(help) || (version && Result.isErr(version))) {
				const helpErrors = Result.isErr(help) ? help.error.errors : [];
				const versionErrors =
					version && Result.isErr(version) ? version.error.errors : [];
				return Result.err({ errors: [...helpErrors, ...versionErrors] });
			}

			if (help.value) {
				return Result.ok("help");
			}
			if (version?.value) {
				return Result.ok("version");
			}
			return Result.err({
				errors: [
					{
						nodes: [],
						message: "Neither help nor version",
					},
				],
			});
		},
	};
}
