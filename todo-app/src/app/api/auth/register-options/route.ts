import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import db, { userDB } from '@/lib/db';

const rpName = 'Todo App';

function getRpConfig(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost';
  const rpID = process.env.RP_ID || host.split(':')[0];
  const proto = request.headers.get('x-forwarded-proto') || (rpID === 'localhost' ? 'http' : 'https');
  const origin = `${proto}://${host}`;
  return { rpID, origin };
}

export async function POST(request: NextRequest) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (user) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
  }

  const newUser = userDB.create(username);

  const { rpID } = getRpConfig(request);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(newUser.id.toString()),
    userName: newUser.username,
    attestationType: 'none',
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  });

  userDB.updateChallenge(newUser.id, options.challenge);

  return NextResponse.json(options);
}
