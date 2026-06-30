import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const vanity = pathname.match(/^\/@([^/]+)\/?$/);
  if (vanity) {
    const url = request.nextUrl.clone();
    url.pathname = `/u/${vanity[1]}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/@:username'],
};
