// src/proxy.ts
//
// Next.js Proxy (formerly Middleware) - the first, cheap gate for the admin
// console. The session cookie is verified (jose signature check) before the
// admin bundle is ever sent; requireSession in the admin layout remains the
// authoritative server-side check.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/session';

const protectedRoutes = ['/admin'];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some((route) => path.startsWith(route));

  if (!isProtected) return NextResponse.next();

  const cookie = (await cookies()).get('session')?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    const url = new URL('/login', req.nextUrl);
    url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
