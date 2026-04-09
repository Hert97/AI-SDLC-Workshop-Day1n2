import { NextRequest, NextResponse } from 'next/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import db, { userDB } from '@/lib/db';

function getRpID(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost';
  return process.env.RP_ID || host.split(':')[0];
}

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const userAuthenticators = userDB.findAuthenticatorsByUserId(user.id);

  const rpID = getRpID(request);

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map(auth => ({
      id: auth.credential_id,
      transports: auth.transports
        ? (auth.transports.split(',').filter(Boolean) as AuthenticatorTransport[])
        : [],
    })),
    userVerification: 'required',
  });

  userDB.updateChallenge(user.id, options.challenge);

  return NextResponse.json(options);
}
