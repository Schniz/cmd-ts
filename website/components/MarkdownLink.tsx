import Link from 'next/link';

export function MarkdownLink(props: {
  href: string;
  children: React.ReactNode;
}) {
  const href = props.href.replace(/\.md$/, '');
  if (href.startsWith('./') || href.startsWith('/docs/')) {
    return (
      <Link href="/docs/[...page]" as={href}>
        <a>{props.children}</a>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <a>{props.children}</a>
    </Link>
  );
}
