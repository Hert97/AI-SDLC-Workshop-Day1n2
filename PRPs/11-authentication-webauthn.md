# PRP 11: WebAuthn / Passkeys Authentication

## Overview
Passwordless authentication using WebAuthn/Passkeys via `@simplewebauthn/server` and `@simplewebauthn/browser`. Sessions managed with HTTP-only JWT cookies.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Registration works with passkey
- [ ] Login works with passkey
- [ ] Session persists 7 days
- [ ] Logout clears session immediately
- [ ] Protected routes secured

## Database Schema
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE authenticators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  credential_id TEXT NOT NULL UNIQUE,
  credential_public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT
);
```

## Environment Variables
```bash
JWT_SECRET=<random 32+ char string>
RP_ID=localhost            # or production domain
RP_NAME=Todo App
RP_ORIGIN=http://localhost:3000  # or https://...
```

## lib/auth.ts
```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'session';

export interface Session { userId: number; username: string; }

export async function createSession(payload: Session): Promise<void> {
  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
```

## API Routes

### POST /api/auth/register-options
```typescript
import { generateRegistrationOptions } from '@simplewebauthn/server';
// 1. Find or create user by username
// 2. Get existing authenticators for user
// 3. Generate options
const options = await generateRegistrationOptions({
  rpName: process.env.RP_NAME!,
  rpID: process.env.RP_ID!,
  userID: isoUint8Array.fromUTF8String(String(user.id)),
  userName: username,
  excludeCredentials: authenticators.map(a => ({
    id: a.credential_id,
    transports: a.transports ? JSON.parse(a.transports) : [],
  })),
  authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
});
// Store challenge in session (use a temporary cookie or DB)
return NextResponse.json(options);
```

### POST /api/auth/register-verify
```typescript
import { verifyRegistrationResponse } from '@simplewebauthn/server';
// 1. Get challenge from stored temp
// 2. Verify response
const verification = await verifyRegistrationResponse({
  response: body,
  expectedChallenge: challenge,
  expectedOrigin: process.env.RP_ORIGIN!,
  expectedRPID: process.env.RP_ID!,
});
if (verification.verified && verification.registrationInfo) {
  const { credential } = verification.registrationInfo;
  authenticatorDB.create({
    user_id: user.id,
    credential_id: credential.id,
    credential_public_key: Buffer.from(credential.publicKey),
    counter: credential.counter ?? 0,
    transports: JSON.stringify(body.response.transports ?? []),
  });
  await createSession({ userId: user.id, username: user.username });
}
return NextResponse.json({ verified: verification.verified });
```

### POST /api/auth/login-options
```typescript
import { generateAuthenticationOptions } from '@simplewebauthn/server';
const authenticators = authenticatorDB.getForUser(user.id);
const options = await generateAuthenticationOptions({
  rpID: process.env.RP_ID!,
  allowCredentials: authenticators.map(a => ({ id: a.credential_id })),
  userVerification: 'preferred',
});
// Store challenge temporarily
return NextResponse.json(options);
```

### POST /api/auth/login-verify
```typescript
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
const authenticator = authenticatorDB.getByCredentialId(body.id);
const verification = await verifyAuthenticationResponse({
  response: body,
  expectedChallenge: challenge,
  expectedOrigin: process.env.RP_ORIGIN!,
  expectedRPID: process.env.RP_ID!,
  credential: {
    id: authenticator.credential_id,
    publicKey: authenticator.credential_public_key,
    counter: authenticator.counter ?? 0,
  },
});
if (verification.verified) {
  authenticatorDB.updateCounter(authenticator.id, verification.authenticationInfo.newCounter ?? 0);
  await createSession({ userId: user.id, username: user.username });
}
return NextResponse.json({ verified: verification.verified });
```

### POST /api/auth/logout
```typescript
await deleteSession();
return NextResponse.json({ success: true });
```

### GET /api/auth/me
```typescript
const session = await getSession();
if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
return NextResponse.json(session);
```

## middleware.ts
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = ['/', '/calendar'];
const AUTH_ONLY = ['/login'];

export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  if (PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/')) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (AUTH_ONLY.includes(pathname) && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/', '/calendar', '/login'] };
```

## Login Page (/login)
- Two flows: **Register** (new user) and **Login** (existing user)
- Username input shared between both
- Use `@simplewebauthn/browser`: `startRegistration()` and `startAuthentication()`
- On success → redirect to `/`

## Testing Checklist
- [ ] E2E: Register new user with virtual authenticator
- [ ] E2E: Login with registered user
- [ ] E2E: Logout → session cookie cleared → redirected to /login
- [ ] E2E: Visit / without auth → redirected to /login
- [ ] E2E: Visit /login when authenticated → redirected to /
- [ ] E2E: GET /api/auth/me returns session data when logged in
- [ ] Unit: createSession() sets HTTP-only cookie
- [ ] Unit: getSession() returns null for expired/invalid token
