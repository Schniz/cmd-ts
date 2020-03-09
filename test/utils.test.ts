import { padNoAnsi } from '../src/utils';
import stripAnsi from 'strip-ansi';
import chalk from 'chalk';

describe('padNoAnsi', () => {
  it('pads start', () => {
    const expected = 'hello'.padStart(10, ' ');
    const actual = padNoAnsi(
      chalk`{red h}{cyan e}{blue l}{green l}{red o}`,
      10,
      'start'
    );
    expect(stripAnsi(actual)).toEqual(expected);
  });
  it('pads end', () => {
    const expected = 'hello'.padEnd(10, ' ');
    const actual = padNoAnsi(
      chalk`{red h}{cyan e}{blue l}{green l}{red o}`,
      10,
      'end'
    );
    expect(stripAnsi(actual)).toEqual(expected);
  });
  it('returns the string if it is shorter than the padding', () => {
    const str = chalk`{red h}{cyan e}{blue l}{green l}{red o}`;
    const actual = padNoAnsi(str, 2, 'end');
    expect(actual).toEqual(str);
  });
});
