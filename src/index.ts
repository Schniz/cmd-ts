/**
 * The index module: the entrance to the world of cmd-ts 😎
 *
 * @packageDocumentation
 */

export { subcommands } from "./subcommands";
export { type Type, extendType } from "./type";
export * from "./types";
export { binary } from "./binary";
export { command } from "./command";
export { flag } from "./flag";
export {
	setDefaultHelpFormatter,
	resetHelpFormatter,
	defaultHelpFormatter,
	type HelpFormatter,
	type CommandHelpData,
	type SubcommandsHelpData,
	type Example,
} from "./helpFormatter";
export { option } from "./option";
export { positional } from "./positional";
export { dryRun, runSafely, run, parse, type Runner } from "./runner";
export { restPositionals } from "./restPositionals";
export { multiflag } from "./multiflag";
export { multioption } from "./multioption";
export { union } from "./union";
export { oneOf } from "./oneOf";
export { rest } from "./rest";
