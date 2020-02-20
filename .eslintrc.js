module.exports = {
  extends: [
    'react-app',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
    'plugin:import/errors',
    'plugin:import/typescript',
  ],
  rules: {
    'import/default': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['test/**', 'src/example/**'],
        optionalDependencies: false
      },
    ],
  },
  settings: {
    react: {
      version: '999.999.999',
    },
  }
};
