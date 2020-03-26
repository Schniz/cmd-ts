const shiki = require('shiki');

const withMDX = require('@next/mdx')({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [
      require('remark-slug'),
      [
        require('remark-autolink-headings'),
        {
          behavior: 'append',
          content: {
            type: 'element',
            tagName: 'span',
            properties: { className: ['heading-link'] },
            children: [
              {
                type: 'text',
                value: ' #',
              },
            ],
          },
        },
      ],
      [
        require('gridsome-plugin-remark-shiki'),
        {
          theme: shiki.loadTheme('./vendor/github-theme.json'),
          skipInline: true,
        },
      ],
    ],
  },
});

module.exports = withMDX({
  pageExtensions: ['js', 'tsx', 'ts'],
  webpack: config => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '~': __dirname,
    };
    return config;
  },
});
