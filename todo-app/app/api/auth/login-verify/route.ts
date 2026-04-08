import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSession } from '@/lib/auth';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body?.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 422 });
  }

  const cookieStore = await cookies();
  const challenge = cookieStore.get('webauthn_login_challenge')?.value;
  if (!challenge) {
    return NextResponse.json({ error: 'Missing login challenge' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await createSession({ userId: user.id, username: user.username });
  cookieStore.delete('webauthn_login_challenge');

  return NextResponse.json({ verified: true });
}
