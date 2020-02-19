/**
 * @ignore
 * @packageDocumentation
 */

/**
 * A parsed item
 */
export type ParseItem =
  | {
      name?: string;
      type: 'positional';
      position: number;
      input: string;
      forced: boolean;
      hide: boolean;
    }
  | {
      type: 'namedArgument';
      inputKey: string;
      inputValue?: string;
      skipped: boolean;
      key: string;
      value: string;
    }
  | { type: 'forcePositional' };

export interface MinimistResult {
  positional: string[];
  named: Record<string, string[]>;
  context: ParseItem[];
}

function hasNamedArgumentPrefix(s: string): boolean {
  return s.startsWith('-') && !/^-+$/.test(s);
}

export type MinimistNamedArguments = {
  short: Record<string, string>;
  long: Record<string, string>;
  forceBoolean: Set<string>;
  positional: Record<number, string>;
};

export function minimist(
  args: string[],
  namedArgs: MinimistNamedArguments
): MinimistResult {
  let index = 0;
  let forcePositional = false;
  let positionalIndex = 0;
  const result: MinimistResult = { positional: [], named: {}, context: [] };

  while (index < args.length) {
    const input = args[index];

    if (forcePositional || (!hasNamedArgumentPrefix(input) && input !== '--')) {
      const keyName = namedArgs.positional[positionalIndex];
      if (keyName) {
        result.named[keyName] = (result.named[keyName] || []).concat(input);
      } else {
        result.positional.push(input);
      }
      result.context.push({
        type: 'positional',
        forced: forcePositional,
        input,
        name: namedArgs.positional[positionalIndex],
        position: positionalIndex,
        hide: false,
      });
      positionalIndex++;
      index++;
    } else if (input === '--') {
      forcePositional = true;
      result.context.push({ type: 'forcePositional' });
      index++;
    } else {
      let inputKey: string;
      let value: string;
      let inputValue: string | undefined;

      if (input.includes('=')) {
        const [inputKey_, ...inputValues] = input.split('=');
        value = inputValues.join('=');
        inputValue = value;
        inputKey = inputKey_;
      } else {
        inputKey = input;
        inputValue = args[index + 1];
        if (!inputValue || hasNamedArgumentPrefix(inputValue)) {
          inputValue = undefined;
          value = 'true';
        } else {
          value = args[++index];
        }
      }

      let key: string;
      let skipped: boolean;
      if (inputKey.startsWith('--')) {
        const keyWithoutPrefix = inputKey.slice(2);
        key = namedArgs.long[keyWithoutPrefix] ?? keyWithoutPrefix;
        skipped = !Boolean(namedArgs.long[keyWithoutPrefix]);
      } else {
        const keyWithoutPrefix = inputKey.slice(1);
        if (keyWithoutPrefix.length === 1) {
          key = namedArgs.short[keyWithoutPrefix] ?? keyWithoutPrefix;
          skipped = !Boolean(namedArgs.short[keyWithoutPrefix]);
        } else {
          for (const shortBooleanKey of keyWithoutPrefix.slice(0, -1)) {
            const key = namedArgs.short[shortBooleanKey] ?? shortBooleanKey;
            result.context.push({
              type: 'namedArgument',
              inputKey: `-${shortBooleanKey}`,
              skipped: !Boolean(namedArgs.short[shortBooleanKey]),
              key,
              value: 'true',
            });
            result.named[key] = (result.named[key] ?? []).concat(['true']);
          }
          const lastKey = keyWithoutPrefix[keyWithoutPrefix.length - 1];
          inputKey = `-${lastKey}`;
          key = namedArgs.short[lastKey] ?? lastKey;
          skipped = !Boolean(namedArgs.short[keyWithoutPrefix]);
        }
      }
      if (!skipped && namedArgs.forceBoolean.has(key) && inputValue) {
        index--;
        inputValue = undefined;
        value = 'true';
      }

      result.named[key] = (result.named[key] ?? []).concat([value]);
      result.context.push({
        type: 'namedArgument',
        inputKey,
        inputValue,
        key,
        value,
        skipped,
      });
      index++;
    }
  }

  return result;
}
