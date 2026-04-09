import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const config = {
  matcher: ['/', '/calendar'],
};

export async function proxy(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
