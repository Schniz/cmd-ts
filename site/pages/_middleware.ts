import { NextRequest, NextResponse } from 'next/server';

export default function middleware(req: NextRequest) {
  const replacedPathname = req.nextUrl.pathname
    .replace(/_/g, '-')
    .replace(/\.md$/, '');
  if (replacedPathname !== req.nextUrl.pathname) {
    const newUrl = req.nextUrl.clone();
    newUrl.pathname = replacedPathname;
    return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
}
