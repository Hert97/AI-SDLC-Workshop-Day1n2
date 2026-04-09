import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { username } = await request.json() as { username?: string };
  if (!username?.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  let user = userDB.findByUsername(username.trim());
  if (!user) user = userDB.create(username.trim());

  const authenticators = authenticatorDB.getForUser(user.id);

  const options = await generateRegistrationOptions({
    rpName: process.env.RP_NAME ?? 'Todo App',
    rpID: process.env.RP_ID ?? 'localhost',
    userID: new TextEncoder().encode(String(user.id)),
    userName: user.username,
    excludeCredentials: authenticators.map((a) => ({
      id: a.credential_id,
      transports: a.transports
        ? (JSON.parse(a.transports) as AuthenticatorTransportFuture[])
        : [],
    })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });

  // Store challenge in a temporary cookie
  const cookieStore = await cookies();
  cookieStore.set('reg_challenge', JSON.stringify({ challenge: options.challenge, userId: user.id }), {
    httpOnly: true,
    maxAge: 300,
    path: '/',
  });

  return NextResponse.json(options);
}
