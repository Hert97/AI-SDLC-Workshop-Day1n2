import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import { authenticatorDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { username, credential } = await request.json() as {
    username?: string;
    credential?: RegistrationResponseJSON;
  };

  if (!username?.trim() || !credential) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const challengeCookie = cookieStore.get('reg_challenge')?.value;
  if (!challengeCookie) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
  }

  const { challenge, userId } = JSON.parse(challengeCookie) as { challenge: string; userId: number };
  cookieStore.delete('reg_challenge');

  const user = userDB.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.RP_ORIGIN ?? 'http://localhost:3000',
      expectedRPID: process.env.RP_ID ?? 'localhost',
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential: cred } = verification.registrationInfo;
      authenticatorDB.create({
        user_id: user.id,
        credential_id: cred.id,
        credential_public_key: Buffer.from(cred.publicKey),
        counter: cred.counter ?? 0,
        transports: JSON.stringify(credential.response.transports ?? []),
      });
      await createSession({ userId: user.id, username: user.username });
    }

    return NextResponse.json({ verified: verification.verified });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 400 },
    );
  }
}
