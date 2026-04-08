import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body?.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 422 });
  }

  const user = userDB.findOrCreate(username);
  const challenge = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set('webauthn_register_challenge', challenge, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 300,
  });

  return NextResponse.json({
    challenge,
    user: { id: String(user.id), name: user.username, displayName: user.username },
    rp: {
      id: process.env.RP_ID ?? 'localhost',
      name: process.env.RP_NAME ?? 'Todo App',
    },
  });
}
