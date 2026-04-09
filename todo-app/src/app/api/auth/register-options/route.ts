import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import db, { userDB } from '@/lib/db';

const rpName = 'Todo App';
const rpID = process.env.NODE_ENV === 'production' ? (process.env.RP_ID || 'your-domain.com') : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? `https://${rpID}` : `http://${rpID}:3000`;

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
