import chalk from "chalk";
import type { ParseContext } from "./argparser";
import type { HelpTopic } from "./helpdoc";
import { entries, groupBy, padNoAnsi } from "./utils";

/**
 * An example to show in help output
 */
export type Example = {
	/** Description of what this example does */
	description: string;
	/** The command to run */
	command: string;
};

/**
 * Structured data for command help
 */
export type CommandHelpData = {
	/** The command name */
	name: string;
	/** Breadcrumb path to this command (e.g., ["sandbox", "create"]) */
	path: string[];
	/** Version string */
	version?: string;
	/** Description of the command */
	description?: string;
	/** Aliases for the command */
	aliases?: string[];
	/** Help topics for flags, options, arguments */
	helpTopics: HelpTopic[];
	/** Examples to show in help output */
	examples?: Example[];
};

/**
 * Structured data for subcommands help
 */
export type SubcommandsHelpData = {
	/** The name of the subcommands group */
	name: string;
	/** Breadcrumb path (e.g., ["sandbox"]) */
	path: string[];
	/** Version string */
	version?: string;
	/** Description of the subcommands group */
	description?: string;
	/** Available subcommands */
	commands: Array<{
		name: string;
		description?: string;
		aliases?: string[];
		/** Help topics from the command (to derive argument hints) */
		helpTopics: HelpTopic[];
	}>;
	/** Examples to show in help output */
	examples?: Example[];
};

/**
 * Interface for custom help formatters.
 * Implement this to create your own help output style.
 */
export interface HelpFormatter {
	/** Format help output for a single command */
	formatCommand(data: CommandHelpData, context: ParseContext): string;
	/** Format help output for a subcommands group */
	formatSubcommands(data: SubcommandsHelpData, context: ParseContext): string;
}

// Global formatter storage
let currentFormatter: HelpFormatter | null = null;

/**
 * Set a custom help formatter to be used for all commands.
 *
 * @example
 * ```ts
 * import { setDefaultHelpFormatter } from "cmd-ts";
 *
 * setDefaultHelpFormatter({
 *   formatCommand(data, context) {
 *     return `My CLI ${data.version}\n${data.description}`;
 *   },
 *   formatSubcommands(data, context) {
 *     return `Commands: ${data.commands.map(c => c.name).join(", ")}`;
 *   },
 * });
 * ```
 */
export function setDefaultHelpFormatter(formatter: HelpFormatter): void {
	currentFormatter = formatter;
}

/**
 * Reset the help formatter to the default.
 * Useful for testing.
 */
export function resetHelpFormatter(): void {
	currentFormatter = null;
}

/**
 * Get the current help formatter (custom or default).
 * @internal
 */
export function getHelpFormatter(): HelpFormatter {
	return currentFormatter ?? defaultHelpFormatter;
}

/**
 * The default help formatter that matches cmd-ts's original output style.
 */
export const defaultHelpFormatter: HelpFormatter = {
	formatCommand(data: CommandHelpData, _context: ParseContext): string {
		const lines: string[] = [];

		let name = data.path.length > 0 ? data.path.join(" ") : data.name;
		name = chalk.bold(name);

		if (data.version) {
			name += ` ${chalk.dim(data.version)}`;
		}

		lines.push(name);

		if (data.description) {
			lines.push(chalk.dim("> ") + data.description);
		}

		const usageBreakdown = groupBy(data.helpTopics, (x) => x.category);

		for (const [category, helpTopics] of entries(usageBreakdown)) {
			lines.push("");
			lines.push(`${category.toUpperCase()}:`);
			const widestUsage = helpTopics.reduce((len, curr) => {
				return Math.max(len, curr.usage.length);
			}, 0);
			for (const helpTopic of helpTopics) {
				let line = "";
				line += `  ${padNoAnsi(helpTopic.usage, widestUsage, "end")}`;
				line += " - ";
				line += helpTopic.description;
				for (const defaultValue of helpTopic.defaults) {
					line += chalk.dim(` [${defaultValue}]`);
				}
				lines.push(line);
			}
		}

		if (data.examples && data.examples.length > 0) {
			lines.push("");
			lines.push("EXAMPLES:");
			for (const example of data.examples) {
				lines.push("");
				lines.push(`  ${example.description}`);
				lines.push(chalk.dim(`  $ ${example.command}`));
			}
		}

		return lines.join("\n");
	},

	formatSubcommands(data: SubcommandsHelpData, _context: ParseContext): string {
		const lines: string[] = [];
		const argsSoFar = data.path.length > 0 ? data.path.join(" ") : data.name;

		lines.push(chalk.bold(argsSoFar + chalk.italic(" <subcommand>")));

		if (data.description) {
			lines.push(chalk.dim("> ") + data.description);
		}

		lines.push("");
		lines.push(`where ${chalk.italic("<subcommand>")} can be one of:`);
		lines.push("");

		for (const cmd of data.commands) {
			let description = cmd.description ?? "";
			description = description && ` - ${description} `;
			if (cmd.aliases?.length) {
				const aliasTxt = cmd.aliases.length === 1 ? "alias" : "aliases";
				const aliases = cmd.aliases.join(", ");
				description += chalk.dim(`[${aliasTxt}: ${aliases}]`);
			}
			const row = chalk.dim("- ") + cmd.name + description;
			lines.push(row.trim());
		}

		const helpCommand = chalk.yellow(`${argsSoFar} <subcommand> --help`);

		lines.push("");
		lines.push(chalk.dim(`For more help, try running \`${helpCommand}\``));

		if (data.examples && data.examples.length > 0) {
			lines.push("");
			lines.push("EXAMPLES:");
			for (const example of data.examples) {
				lines.push("");
				lines.push(`  ${example.description}`);
				lines.push(chalk.dim(`  $ ${example.command}`));
			}
		}

		return lines.join("\n");
	},
};
