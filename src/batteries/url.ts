import { URL } from "url";
import { extendType, string } from "..";

/**
 * Decodes a string into the `URL` type
 */
export const Url = extendType(string, {
	displayName: "url",
	description: "A valid URL",
	async from(str): Promise<URL> {
		const url = new URL(str);
		if (!url.protocol || !url.host) {
			throw new Error("Malformed URL");
		}

		if (!["http:", "https:"].includes(url.protocol as string)) {
			throw new Error("Only allowed http and https URLs");
		}

		return url;
	},
});

/**
 * Decodes an http/https only URL
 */
export const HttpUrl = extendType(Url, {
	async from(url): Promise<URL> {
		if (!["http:", "https:"].includes(url.protocol as string)) {
			throw new Error("Only allowed http and https URLs");
		}

		return url;
	},
});
