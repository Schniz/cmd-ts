module.exports = {
  exclude: ['test/**', 'src/example/**'],
  excludeExternals: true,
  excludeNotExported: true,
  excludePrivate: true,
  hideGenerator: true,
  includes: './src',
  out: 'public',
  module: 'commonjs',
  stripInternal: 'true'
};
