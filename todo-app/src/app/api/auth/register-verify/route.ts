import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import db, { userDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

function getRpConfig(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost';
  const rpID = process.env.RP_ID || host.split(':')[0];
  const proto = request.headers.get('x-forwarded-proto') || (rpID === 'localhost' ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  return { rpID, origin };
}

export async function POST(request: NextRequest) {
  const { rpID, origin } = getRpConfig(request);
  const body = await request.json();
  const { userId, cred } = body;

  if (!userId || !cred) {
    return NextResponse.json({ error: 'Missing user ID or credential' }, { status: 400 });
  }

  // userId is the base64url encoding of the UTF-8 user ID bytes
  // (set via userID: new TextEncoder().encode(id.toString()) in register-options)
  let numericUserId: number;
  try {
    const decoded = Buffer.from(userId, 'base64url').toString('utf8');
    numericUserId = parseInt(decoded, 10);
    if (isNaN(numericUserId)) throw new Error('Not a number');
  } catch {
    return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
  }

  const user = userDB.findUserById(numericUserId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const expectedChallenge = user.current_challenge;
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'No challenge found for user' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: cred,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    const { credential } = registrationInfo;

    const existingAuthenticator = userDB.findAuthenticatorByCredentialId(credential.id);
    if (existingAuthenticator) {
      return NextResponse.json({ error: 'Authenticator already registered' }, { status: 400 });
    }

    userDB.createAuthenticator({
      user_id: user.id,
      credential_id: credential.id,
      credential_public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: cred.response.transports?.join(',') || '',
    });

    await createSession(user);

    return NextResponse.json({ verified });
  }

  return NextResponse.json({ verified: false }, { status: 400 });
}
