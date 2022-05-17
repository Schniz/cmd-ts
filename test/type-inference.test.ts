import { test, expect } from 'vitest';
import { getTypes } from 'infer-types';
import path from 'path';

test('types are inferred correctly', () => {
  const filepath = path.join(__dirname, '../example/app.ts');
  const types = getTypes(filepath);
  expect(types).toEqual({
    'cat -> stream': 'Stream',
    'cat -> restStreams': 'Stream[]',
    'complex -> intOrString': 'string | number',
    'complex -> floatOrString': 'string | number',
    'complex -> pos2': 'string',
    'complex -> optionWithoutType': 'string',
    'complex -> boolWithoutType': 'boolean',
    'complex -> rest': 'string[]',
    'greet -> greeting': 'string',
    'greet -> name': 'string',
    'greet -> noExclaim': 'boolean',
  });
});
