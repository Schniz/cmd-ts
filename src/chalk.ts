import chalk, { Chalk } from 'chalk';

let mode: 'chalk' | 'tags' | 'disabled' = 'chalk';

export function setMode(newMode: typeof mode) {
  mode = newMode;
}

type ColorizerFunction = (...strings: string[]) => string;

type AllColorOptions = Extract<
  typeof allColors[keyof typeof allColors],
  string
>;

type Colored = {
  [key in AllColorOptions]: ColoredFunction;
};
type ColoredFunction = ColorizerFunction & Colored;

type Strategy = (
  levels: AllColorOptions[],
  str: string
) => ReturnType<ColorizerFunction>;

function withLevels(
  levels: AllColorOptions[],
  strategy: Strategy
): ColoredFunction {
  const fn: ColorizerFunction = str => strategy(levels, str);
  Object.assign(fn, generateColoredBody(fn, levels, strategy));
  return fn as any;
}

const allColors = [
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'grey',
  'blackBright',
  'redBright',
  'greenBright',
  'yellowBright',
  'blueBright',
  'magentaBright',
  'cyanBright',
  'whiteBright',
  'italic',
  'bold',
  'underline',
] as const;

function generateColoredBody<T>(
  wrapper: T,
  levels: AllColorOptions[],
  strategy: Strategy
): T & Colored {
  const c = allColors.reduce((acc, curr) => {
    Object.defineProperty(acc, curr, {
      get() {
        const x = withLevels([...levels, curr], strategy);
        return x;
      },
    });
    return acc;
  }, wrapper as T & Colored);
  return c;
}

const chalked = generateColoredBody({}, [], (levels, str) => {
  const color = levels.reduce<Chalk>((c, curr) => c[curr], chalk);
  return color(str);
});

const tagged = generateColoredBody({}, [], (levels, str) => {
  const [start, end] = levels.reduce(
    (acc, curr) => {
      acc[0] += `<${curr}>`;
      acc[1] = `</${curr}>${acc[1]}`;
      return acc;
    },
    ['', '']
  );
  return `${start}${str}${end}`;
});

const disabled = generateColoredBody({}, [], (_levels, str) => str);

export function colored(): Colored {
  if (mode === 'chalk') return chalked;
  if (mode === 'disabled') return disabled;
  return tagged;
}

setMode('tags');

console.log(colored().red.bold('hello'));

setMode('chalk');

console.log(colored().red.bold('hello'));
