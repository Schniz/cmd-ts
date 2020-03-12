/**
 * The index module: the entrance to the world of clio-ts 😎
 *
 * Also export the entire `io-ts` module as `t`, for convenience.
 *
 * @packageDocumentation
 */

export { subcommands } from './subcommands';
export { Type, extendType } from './type';
export * from './types';
export { binary } from './binary';
export { command } from './command';
export { flag } from './flag';
export { option } from './option';
export { positional } from './positional';
export { run, Runner } from './runner';
export { restPositionals } from './restPositionals';
export { multiflag } from './multiflag';
export { multioption } from './multioption';
export { union } from './union';
