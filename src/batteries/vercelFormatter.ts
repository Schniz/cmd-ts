import chalk from "chalk";
import type { ParseContext } from "../argparser";
import type {
	CommandHelpData,
	HelpFormatter,
	SubcommandsHelpData,
} from "../helpFormatter";

/**
 * Configuration for the Vercel-style help formatter
 */
export type VercelFormatterConfig = {
	/**
	 * The CLI name to display in the header (e.g., "Vercel Sandbox CLI")
	 */
	cliName?: string;
	/**
	 * Logo/symbol to display before the command name (e.g., "▲")
	 */
	logo?: string;
};

/**
 * Extract argument hints from help topics.
 * Returns a string like "[cmd]" or "[src] [dst]" based on positional arguments.
 */
function getArgHint(helpTopics: { category: string; usage: string }[]): string {
	return helpTopics
		.filter((t) => t.category === "arguments")
		.map((t) => t.usage)
		.join(" ");
}

/**
 * Format command name with aliases in "alias | name" style.
 * Prefers shorter alias first for display.
 */
function formatCommandName(name: string, aliases?: string[]): string {
	if (!aliases?.length) {
		return name;
	}
	// Sort aliases by length to prefer shorter ones first
	const sortedAliases = [...aliases].sort((a, b) => a.length - b.length);
	return `${sortedAliases[0]} | ${name}`;
}

/**
 * Create a Vercel-style help formatter.
 *
 * This formatter produces output similar to the Vercel CLI with:
 * - A header with CLI name and version
 * - Logo symbol before the command name
 * - Column-aligned commands with aliases shown as "short | long"
 * - Argument hints derived from positional arguments
 * - Examples section with highlighted commands
 *
 * @example
 * ```ts
 * import { setDefaultHelpFormatter } from "cmd-ts";
 * import { createVercelFormatter } from "cmd-ts/batteries/vercelFormatter";
 *
 * setDefaultHelpFormatter(createVercelFormatter({
 *   cliName: "Vercel Sandbox CLI",
 *   logo: "▲",
 * }));
 * ```
 */
export function createVercelFormatter(
	config: VercelFormatterConfig = {},
): HelpFormatter {
	const { cliName, logo = "▲" } = config;

	return {
		formatCommand(data: CommandHelpData, _context: ParseContext): string {
			const lines: string[] = [];
			const displayName = cliName ?? data.name;

			let header = displayName;
			if (data.version) {
				header += ` ${data.version}`;
			}
			lines.push(chalk.grey(header));

			// Command usage line
			lines.push("");
			const path = data.path.length > 0 ? data.path.join(" ") : data.name;
			lines.push(`${logo} ${chalk.bold(path)} [options]`);

			// Description
			if (data.description) {
				lines.push("");
				lines.push(chalk.dim(data.description));
			}

			// Group help topics by category
			const byCategory = new Map<string, typeof data.helpTopics>();
			for (const topic of data.helpTopics) {
				const existing = byCategory.get(topic.category) ?? [];
				existing.push(topic);
				byCategory.set(topic.category, existing);
			}

			// Render each category
			for (const [category, topics] of byCategory) {
				lines.push("");
				lines.push(chalk.dim(`${capitalize(category)}:`));
				lines.push("");

				// Calculate max width for alignment
				const maxUsageWidth = Math.max(...topics.map((t) => t.usage.length));

				for (const topic of topics) {
					const defaults =
						topic.defaults.length > 0
							? chalk.dim(` [${topic.defaults.join(", ")}]`)
							: "";
					lines.push(
						`    ${topic.usage.padEnd(maxUsageWidth + 2)}${chalk.dim(topic.description)}${defaults}`,
					);
				}
			}

			// Examples
			if (data.examples && data.examples.length > 0) {
				lines.push("");
				lines.push(chalk.dim("Examples:"));

				for (const example of data.examples) {
					lines.push("");
					lines.push(`${chalk.gray("–")} ${example.description}`);
					lines.push("");
					lines.push(chalk.cyan(`  $ ${example.command}`));
				}
			}

			lines.push("");
			return lines.join("\n");
		},

		formatSubcommands(
			data: SubcommandsHelpData,
			_context: ParseContext,
		): string {
			const lines: string[] = [];
			const path = data.path.length > 0 ? data.path.join(" ") : data.name;
			const displayName = cliName ?? path;

			// Header
			if (data.version) {
				lines.push(chalk.grey(`${displayName} ${data.version}`));
			} else {
				lines.push(chalk.grey(displayName));
			}

			// Command usage line
			lines.push("");
			lines.push(`${logo} ${chalk.bold(path)} [options] <command>`);

			// Help hint
			lines.push("");
			lines.push(
				chalk.dim(`For command help, run \`${path} <command> --help\``),
			);

			// Commands section
			lines.push("");
			lines.push(chalk.dim("Commands:"));
			lines.push("");

			// Calculate column widths
			const commandNames = data.commands.map((cmd) =>
				formatCommandName(cmd.name, cmd.aliases),
			);
			const maxNameWidth = Math.max(...commandNames.map((n) => n.length));
			const argHints = data.commands.map((cmd) => getArgHint(cmd.helpTopics));
			const maxArgWidth = Math.max(...argHints.map((a) => a.length), 0);

			// Render commands
			for (let i = 0; i < data.commands.length; i++) {
				const cmd = data.commands[i];
				const displayCommandName = commandNames[i];
				const argHint = argHints[i];

				lines.push(
					`    ${displayCommandName.padEnd(maxNameWidth + 2)}${chalk.dim(argHint.padEnd(maxArgWidth + 2))}${chalk.dim(cmd.description ?? "")}`,
				);
			}

			// Examples
			if (data.examples && data.examples.length > 0) {
				lines.push("");
				lines.push(chalk.dim("Examples:"));

				for (const example of data.examples) {
					lines.push("");
					lines.push(`${chalk.gray("–")} ${example.description}`);
					lines.push("");
					lines.push(chalk.cyan(`  $ ${example.command}`));
				}
			}

			lines.push("");
			return lines.join("\n");
		},
	};
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * A pre-configured Vercel-style formatter with default settings.
 * Uses "▲" as the logo and derives the CLI name from the command name.
 */
export const vercelFormatter = createVercelFormatter();
