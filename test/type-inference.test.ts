import { getTypes } from 'infer-types';
import path from 'path';

test('types are inferred correctly', () => {
  const filepath = path.join(__dirname, '../example/app.ts');
  const types = getTypes(filepath);
  expect(types).toEqual({
    'cat -> stream': 'Stream',
    'complex -> intOrString': 'string | number',
    'complex -> pos2': 'string',
    'greet -> greeting': 'string',
    'greet -> name': 'string',
    'greet -> noExclaim': 'boolean',
  });
});
