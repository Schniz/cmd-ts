import assert from "node:assert";

/**
 * Force cooperative scheduling by yielding control to the event loop
 */
function forceAwait(): Promise<void> {
	return new Promise((resolve) => setImmediate(resolve));
}

export class ArgvItem {
	constructor(
		/**
		 * The original value, coming from process.argv
		 */
		readonly value: string,

		/**
		 * The original index position in the argv array
		 * so we can track it in error messages.
		 */
		readonly index: number,

		readonly span?: [from: number, to: number],
	) {}

	spanned(from: number, to: number): ArgvItem {
		return new ArgvItem(this.value.slice(from, to), this.index, [from, to]);
	}

	static normalize(argv: string[] | ArgvItem[]): ArgvItem[] {
		if (argv.length === 0) {
			return [];
		}

		if (typeof argv[0] !== "string") {
			return argv as ArgvItem[];
		}

		return argv.map((value, index) => new ArgvItem(value as string, index));
	}
}

export class UnmatchedInput extends Error {
	constructor(
		readonly argvItem: ArgvItem,
		message?: string,
	) {
		super(
			message ||
				`Unmatched argument: ${argvItem.value}. No parser can handle this argument.`,
		);
		this.name = "UnmatchedInput";
	}
}

export class ParsingError {
	constructor(
		readonly argv: ArgvItem | "unknown",
		readonly cause: Error,
	) {}
	static make(argv: ArgvItem, cause: Error) {
		return new ParsingError(argv, cause);
	}
	static forUnknownArgv(cause: Error) {
		return new ParsingError("unknown", cause);
	}
}

export interface ParseResult<T> {
	errors: ParsingError[];
	result: Option<T>;
	remainingArgv: ArgvItem[];
}

export type Option<T> = null | { value: T };

export interface Effects {
	/** Get the next `count` items from the argv */
	peek(count: number): ArgvItem[];
	/** Consume the next `count` items from the argv, declaring them as used so other parsers can't touch them. */
	consume(count: number): ArgvItem[];
	/** Skip the next `count` items from the argv without consuming them (they remain in remainingArgv) */
	skip(count: number): ArgvItem[];
	/** Yield the cooperative parser, and return whether we can continue parsing with the current parser. */
	continue(): boolean;
	/** Throw a parsing error */
	break(...errors: ParsingError[]): never;
}

export type Yieldable = {
	[key in keyof Effects]: { key: key; payload: Parameters<Effects[key]> };
}[keyof Effects];
//   ^?
export type YieldResult = {
	[key in keyof Effects]: readonly [key, ReturnType<Effects[key]>];
}[keyof Effects];
//   ^?

export type ParserGen<T> = AsyncGenerator<Yieldable, T, YieldResult>;

export type EffectsGens = {
	[key in keyof Effects]: (
		...args: Parameters<Effects[key]>
	) => Parser<ReturnType<Effects[key]>>;
};

export const effects = new Proxy({} as EffectsGens, {
	get(target, prop: string, receiver: any) {
		if (!(prop in target)) {
			const fn = (...args: any): Parser<any> =>
				new Parser(async function* () {
					const [key, ret] = yield {
						key: prop as keyof Effects,
						payload: args,
					};
					assert(key === prop, `Expected effect ${prop}, got ${key}`);
					return ret;
				});
			Reflect.set(target, prop, fn, receiver);
		}
		return Reflect.get(target, prop, receiver);
	},
});

export class Parser<T> {
	constructor(readonly gen: () => ParserGen<T>) {}
	[Symbol.asyncIterator](): ParserGen<T> {
		return this.gen();
	}

	withConsumed(): Parser<[T, ArgvItem[]]> {
		const wrapped = this;
		return new Parser<[T, ArgvItem[]]>(async function* () {
			const gen = wrapped.gen();
			const trapped: ArgvItem[] = [];
			let state = await gen.next(["continue", true]);
			while (true) {
				// Yield control to the event loop for cooperative scheduling
				await forceAwait();

				if (state.done) {
					return [state.value, trapped];
				}

				const { key, payload } = state.value;
				switch (key) {
					case "consume": {
						const removed = yield* effects.consume(...payload);
						trapped.push(...removed);
						state = await gen.next(["consume", removed]);
						break;
					}
					case "peek": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
					case "break": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
					case "skip": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
					case "continue": {
						const res = yield { key, payload };
						state = await gen.next(res);
						break;
					}
				}
			}
		});
	}
}

export namespace Parser {
	export type Type<T> = T extends Parser<infer U> ? U : never;
	export type IterResult<T> = IteratorResult<Yieldable, T>;
}

function peekFor<T>(fn: (argv: ArgvItem) => T | null) {
	return new Parser<T | null>(async function* () {
		do {
			const [value] = yield* effects.peek(1);
			if (!value) return null;
			const matched = fn(value);
			if (matched) {
				return matched;
			}
		} while (yield* effects.continue());
		return null;
	});
}

function match<T>(fn: (argv: ArgvItem) => T | null) {
	return new Parser<T | null>(async function* () {
		const matched = yield* peekFor(fn);
		if (matched) {
			yield* effects.consume(1);
		}
		return matched;
	});
}

export const createFlag = (name: string) =>
	new Parser(async function* () {
		const flag = yield* match((v) => {
			return v.value === `--${name}` ? v : null;
		});
		return flag !== null;
	});

export const createMultiFlag = (name: string) =>
	new Parser(async function* () {
		let count = 0;
		do {
			const value = yield* effects.peek(1);
			if (!value.length) break;
			if (value[0].value === `--${name}`) {
				yield* effects.consume(1);
				count++;
			}
		} while (yield* effects.continue());
		return count;
	});

export const createRequiredFlag = (name: string) =>
	new Parser(async function* () {
		const prefix = `--${name}=`;
		do {
			const value = yield* effects.peek(1);
			if (!value.length) break;
			if (value[0].value.startsWith(prefix)) {
				yield* effects.consume(1);
				return value[0].value.slice(prefix.length);
			}
		} while (yield* effects.continue());

		return yield* effects.break(
			ParsingError.forUnknownArgv(new Error(`Missing value for --${name}`)),
		);
	});

export function all<const T extends readonly Parser<any>[]>(
	parsers: T,
): Parser<{
	[K in keyof T]: Parser.Type<T[K]>;
}> {
	return new Parser(async function* () {
		const results: any[] = new Array(parsers.length).fill(undefined);
		const allErrors: ParsingError[] = [];

		// Initialize all parser generators
		const generators = parsers.map((parser) => parser.gen());
		const states = await Promise.all(generators.map((gen) => gen.next()));
		const consumed: ArgvItem[][] = Array.from(
			{ length: parsers.length },
			() => [],
		);

		// Keep track of which parsers are still active (not done)
		const activeParsers = new Set(parsers.map((_, i) => i));

		// Cooperative scheduler: cycle through parsers until all are done
		while (activeParsers.size > 0) {
			// Yield control to the event loop for cooperative scheduling
			await forceAwait();

			let schedulerMadeProgress = false;

			// Give each active parser a turn
			for (const i of Array.from(activeParsers)) {
				const gen = generators[i];
				let state = states[i];

				// If parser is done, collect result and remove from active set
				if (state.done) {
					results[i] = state.value;
					activeParsers.delete(i);
					schedulerMadeProgress = true;
					continue;
				}

				// Run parser until it yields (continue) or finishes
				let parserYielded = false;
				const parserErrors: ParsingError[] = [];

				try {
					while (!state.done && !parserYielded) {
						const { key, payload } = state.value as Yieldable;

						switch (key) {
							case "peek": {
								const result = yield { key, payload };
								state = await gen.next(result);
								states[i] = state;
								break;
							}
							case "consume": {
								const result = yield { key, payload };
								consumed[i].push(...(result[1] as ArgvItem[]));
								state = await gen.next(result);
								states[i] = state;
								schedulerMadeProgress = true;
								break;
							}
							case "skip": {
								const result = yield { key, payload };
								state = await gen.next(result);
								states[i] = state;
								schedulerMadeProgress = true;
								break;
							}
							case "continue": {
								// In the all combinator, continue should return true
								// to allow parsers to keep looking through the argument stream
								state = await gen.next([key, true]);
								states[i] = state;
								parserYielded = true; // Yield to scheduler
								break;
							}
							case "break": {
								// Collect errors and mark parser as done
								parserErrors.push(...payload);
								allErrors.push(...parserErrors);
								state = await gen.return({} as never);
								states[i] = state;
								activeParsers.delete(i);
								schedulerMadeProgress = true;
								break;
							}
						}
					}

					// If parser finished naturally, collect result
					if (state.done) {
						results[i] = state.value;
						activeParsers.delete(i);
						schedulerMadeProgress = true;
					}
				} catch (e) {
					const error = e instanceof Error ? e : new Error(String(e));
					if (typeof error === "object" && error instanceof ParsingError) {
						allErrors.push(error);
					} else if (consumed[i].length) {
						allErrors.push(
							...consumed[i].map((c) => ParsingError.make(c, error)),
						);
					} else {
						// Handle unexpected errors
						allErrors.push(
							ParsingError.forUnknownArgv(
								error instanceof Error ? error : new Error(String(error)),
							),
						);
					}
					activeParsers.delete(i);
					schedulerMadeProgress = true;
				}
			}

			// If no parser made progress, we're stuck
			if (!schedulerMadeProgress) {
				// Try to skip one argument to get unstuck
				const skipped = yield* effects.skip(1);
				if (skipped.length === 0) {
					// No more arguments to skip, we're done
					break;
				}
				// We skipped an argument, continue trying
			}
		}

		// Collect any remaining results
		for (const i of activeParsers) {
			const state = states[i];
			if (state.done) {
				results[i] = state.value;
			}
		}

		// All-or-nothing: if any parser didn't complete, fail the whole combinator
		const incompleteParsers = [];
		for (let i = 0; i < parsers.length; i++) {
			if (results[i] === undefined) {
				incompleteParsers.push(i);
			}
		}

		if (incompleteParsers.length > 0) {
			allErrors.push(
				ParsingError.forUnknownArgv(
					new Error(
						`All parsers must complete successfully. Parsers at indices ${incompleteParsers.join(", ")} did not complete.`,
					),
				),
			);
		}

		// If any parser failed, fail the whole combinator
		if (allErrors.length > 0) {
			return yield* effects.break(...allErrors);
		}

		return results as {
			[K in keyof T]: Parser.Type<T[K]>;
		};
	});
}

export async function parse<T>(
	parser: Parser<T>,
	argv: ArgvItem[],
	config?: {
		unmatchedInput?: "skipAndCollect" | "failEarly";
	},
): Promise<ParseResult<T>> {
	const unmatchedInputBehavior = config?.unmatchedInput ?? "skipAndCollect";
	const remainingArgv = [...argv];
	const errors: ParsingError[] = [];
	let position = 0;
	const consumedIndices = new Set<number>();
	let lastConsumedCount = 0;

	const effects: Effects = {
		peek(count: number): ArgvItem[] {
			return remainingArgv.slice(position, position + count);
		},

		consume(count: number): ArgvItem[] {
			const consumed = remainingArgv.slice(position, position + count);
			// Mark these indices as consumed
			for (let i = position; i < position + count; i++) {
				consumedIndices.add(i);
			}
			position += count;
			return consumed;
		},

		skip(count: number): ArgvItem[] {
			const skipped = remainingArgv.slice(position, position + count);
			// Advance position but don't mark as consumed (so they remain in remainingArgv)
			position += count;
			return skipped;
		},

		continue(): boolean {
			// For cooperative scheduling, continue if we made progress (consumed something)
			// or if we haven't reached the end yet
			const currentConsumedCount = consumedIndices.size;
			const madeProgress = currentConsumedCount > lastConsumedCount;
			lastConsumedCount = currentConsumedCount;

			if (madeProgress) {
				// We consumed something, continue from current position
				return position < remainingArgv.length;
			}

			// No progress made, advance position to avoid infinite loop
			position++;
			return position < remainingArgv.length;
		},

		break(...parsingErrors: ParsingError[]): never {
			errors.push(...parsingErrors);
			throw new Error("Parser break");
		},
	};

	try {
		const gen = parser.gen();
		let state = await gen.next();

		while (!state.done) {
			const { key, payload } = state.value;

			// Yield control to the event loop for cooperative scheduling
			await forceAwait();

			switch (key) {
				case "peek": {
					const result = effects.peek(...payload);
					state = await gen.next([key, result]);
					break;
				}
				case "consume": {
					const result = effects.consume(...payload);
					state = await gen.next([key, result]);
					break;
				}
				case "skip": {
					const result = effects.skip(...payload);
					state = await gen.next([key, result]);
					break;
				}

				case "continue": {
					const result = effects.continue(...payload);
					state = await gen.next([key, result]);
					break;
				}
				case "break": {
					try {
						effects.break(...payload);
					} catch {
						// Expected - break throws
					}
					state = await gen.return({} as never);
					break;
				}
			}
		}

		// Handle unmatched input after parsing is complete
		const finalRemainingArgv = remainingArgv.filter(
			(_, index) => !consumedIndices.has(index),
		);

		// If there are unmatched arguments and we're in failEarly mode, add errors
		if (
			finalRemainingArgv.length > 0 &&
			unmatchedInputBehavior === "failEarly"
		) {
			for (const argvItem of finalRemainingArgv) {
				errors.push(
					ParsingError.make(
						argvItem,
						new UnmatchedInput(
							argvItem,
							`Unmatched argument: ${argvItem.value}. No parser can handle this argument.`,
						),
					),
				);
			}
		}

		return {
			errors,
			result: errors.length > 0 ? null : { value: state.value },
			remainingArgv: finalRemainingArgv,
		};
	} catch (error) {
		const allErrors =
			errors.length > 0
				? errors
				: consumedIndices.size === 0
					? [
							ParsingError.forUnknownArgv(
								error instanceof Error ? error : new Error(String(error)),
							),
						]
					: Array.from(consumedIndices, (index) => {
							return ParsingError.make(
								argv[index],
								error instanceof Error ? error : new Error(String(error)),
							);
						});

		// Handle unmatched input after parsing failed
		const finalRemainingArgv = remainingArgv.filter(
			(_, index) => !consumedIndices.has(index),
		);

		// If there are unmatched arguments and we're in failEarly mode, add errors
		if (
			finalRemainingArgv.length > 0 &&
			unmatchedInputBehavior === "failEarly"
		) {
			for (const argvItem of finalRemainingArgv) {
				allErrors.push(
					ParsingError.make(
						argvItem,
						new UnmatchedInput(
							argvItem,
							`Unmatched argument: ${argvItem.value}. No parser can handle this argument.`,
						),
					),
				);
			}
		}

		return {
			errors: allErrors,
			result: null,
			remainingArgv: finalRemainingArgv,
		};
	}
}
