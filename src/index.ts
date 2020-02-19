/**
 * The index module: the entrance to the world of clio-ts 😎
 *
 * Also export the entire `io-ts` module as `t`, for convenience.
 *
 * @packageDocumentation
 */

import * as t from 'io-ts';
export { t };
export { unimplemented } from './utils';
export * from './command';
