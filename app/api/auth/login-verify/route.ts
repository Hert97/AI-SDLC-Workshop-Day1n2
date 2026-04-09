import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { authenticatorDB, userDB } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { username, credential } = await request.json() as {
    username?: string;
    credential?: AuthenticationResponseJSON;
  };

  if (!username?.trim() || !credential) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const challengeCookie = cookieStore.get('auth_challenge')?.value;
  if (!challengeCookie) {
    return NextResponse.json({ error: 'Challenge expired. Please try again.' }, { status: 400 });
  }

  const { challenge, userId } = JSON.parse(challengeCookie) as { challenge: string; userId: number };
  cookieStore.delete('auth_challenge');

  const user = userDB.findById(userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const authenticator = authenticatorDB.getByCredentialId(credential.id);
  if (!authenticator || authenticator.user_id !== userId) {
    return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challenge,
      expectedOrigin: process.env.RP_ORIGIN ?? 'http://localhost:3000',
      expectedRPID: process.env.RP_ID ?? 'localhost',
      requireUserVerification: false,
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(authenticator.credential_public_key),
        counter: authenticator.counter ?? 0,
      },
    });

    if (verification.verified) {
      authenticatorDB.updateCounter(
        authenticator.id,
        verification.authenticationInfo.newCounter ?? 0,
      );
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
