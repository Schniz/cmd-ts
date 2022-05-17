module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'plugin:@typescript-eslint/base',
    'plugin:import/errors',
    'plugin:prettier/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'import/default': 0,
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/explicit-function-return-type': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['test/**', 'example/**'],
        optionalDependencies: false,
      },
    ],
  },
};
