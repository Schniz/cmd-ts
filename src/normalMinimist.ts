import camelCase from 'lodash.camelcase';
import minimist from 'minimist';

export type NormalizedMinimist = {
  positional: string[];
  named: Record<string, string[]>;
};

export function normalizeMinimist(
  mmst: ReturnType<typeof minimist>
): NormalizedMinimist {
  const { _: positional, ...rest } = mmst;
  const named: Record<string, string[]> = {};

  for (const [kebabKey, anyvalue] of Object.entries(rest)) {
    const key = camelCase(kebabKey);
    const value = Array.isArray(anyvalue)
      ? anyvalue.map(String)
      : String(anyvalue);
    named[key] = (named[key] || []).concat(value);
  }

  return { named, positional };
}
