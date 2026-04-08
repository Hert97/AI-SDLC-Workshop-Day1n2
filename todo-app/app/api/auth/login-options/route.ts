import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body?.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 422 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const challenge = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('webauthn_login_challenge', challenge, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300,
  });

  return NextResponse.json({ challenge });
}
