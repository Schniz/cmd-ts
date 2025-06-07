import fs from "fs";
import path from "path";
import { extendType, string } from "..";

/**
 * Resolves an existing path. Produces an error when path does not exist.
 * When provided a relative path, extends it using the current working directory.
 */
export const ExistingPath = extendType(string, {
	displayName: "path",
	description: "An existing path",
	async from(str) {
		const resolved = path.resolve(str);

		if (!fs.existsSync(resolved)) {
			throw new Error("Path doesn't exist");
		}

		return resolved;
	},
});

/**
 * Resolves to a directory if given one, and to a file's directory if file was given.
 * Fails when the directory or the given file does not exist.
 */
export const Directory = extendType(ExistingPath, {
	async from(resolved) {
		const stat = fs.statSync(resolved);

		if (stat.isDirectory()) {
			return resolved;
		}

		return path.dirname(resolved);
	},
	displayName: "dir",
	description: "A path to a directory or a file within a directory",
});

/**
 * Resolves to a path to an existing file
 */
export const File = extendType(ExistingPath, {
	async from(resolved) {
		const stat = fs.statSync(resolved);

		if (stat.isFile()) {
			return resolved;
		}

		throw new Error("Provided path is not a file");
	},
	displayName: "file",
	description: "A file in the file system",
});
