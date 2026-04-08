import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { username } = await request.json() as { username?: string };
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username.trim());
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.getForUser(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json({ error: 'No passkeys registered for this user' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID ?? 'localhost',
    allowCredentials: authenticators.map((a) => ({ id: a.credential_id })),
    userVerification: 'preferred',
  });

  const cookieStore = await cookies();
  cookieStore.set('auth_challenge', JSON.stringify({ challenge: options.challenge, userId: user.id }), {
    httpOnly: true,
    maxAge: 300,
    path: '/',
  });

  return NextResponse.json(options);
}
