import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import db, { userDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

const rpID = process.env.NODE_ENV === 'production' ? (process.env.RP_ID || 'your-domain.com') : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:3000`;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, cred } = body;

  if (!username || !cred) {
    return NextResponse.json({ error: 'Missing username or credential' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const expectedChallenge = user.current_challenge;
  if (!expectedChallenge) {
    return NextResponse.json({ error: 'No challenge found for user' }, { status: 400 });
  }

  // Decode credential ID to raw bytes for comparison.
  // Node.js 'base64url' encoding accepts both standard base64 (+//) and
  // base64url (-/_), with or without padding — the most robust approach.
  let credIdBytes: Buffer;
  try {
    credIdBytes = Buffer.from(cred.id, 'base64url');
  } catch {
    return NextResponse.json({ error: 'Invalid credential ID format' }, { status: 400 });
  }

  const userAuthenticators = userDB.findAuthenticatorsByUserId(user.id);
  const authenticator = userAuthenticators.find((a) => {
    try {
      return Buffer.from(a.credential_id, 'base64url').equals(credIdBytes);
    } catch {
      return false;
    }
  });
  if (!authenticator) {
    return NextResponse.json({ error: 'Authenticator not found' }, { status: 404 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: cred,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(Buffer.from(authenticator.credential_public_key, 'base64')),
        counter: authenticator.counter ?? 0,
        transports: authenticator.transports
          ? (authenticator.transports.split(',').filter(Boolean) as AuthenticatorTransport[])
          : [],
      },
      requireUserVerification: true,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    const { newCounter } = authenticationInfo;
    userDB.updateAuthenticatorCounter(authenticator.id, newCounter);
    await createSession(user);
    return NextResponse.json({ verified });
  }

  return NextResponse.json({ verified: false }, { status: 400 });
}
