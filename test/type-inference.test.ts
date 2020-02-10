import { getTypes } from 'infer-types';
import path from 'path';

test('types are inferred correctly', () => {
  const filepath = path.join(__dirname, '../src/example/app.ts');
  const types = getTypes(filepath);
  expect(types).toEqual({
    'cat -> stream': 'Stream',
    'greet -> greeting': 'string',
    'greet -> name': 'string',
    'greet -> noExclaim': 'boolean',
    'composed -> cat -> stream': 'Stream',
  });
});
