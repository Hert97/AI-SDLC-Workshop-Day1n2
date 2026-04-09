# PRP 11: Authentication (WebAuthn/Passkeys)

## Feature Overview

Implement passwordless authentication using WebAuthn/Passkeys with JWT-backed sessions and route protection.

This PRP aligns to Feature 11 criteria in EVALUATION.md and user behavior in USER_GUIDE.md.

## User Stories

1. As a user, I can register with a username and passkey.
2. As a user, I can log in with my passkey.
3. As a user, I stay logged in via secure session cookie.
4. As a user, I can log out and immediately end my session.
5. As a user, protected routes redirect to login when unauthenticated.

## User Flow

1. User opens login/register page.
2. Registration:
   - User submits username.
   - App requests register options.
   - Browser WebAuthn prompt completes credential creation.
   - App sends verification payload.
   - Server stores authenticator and creates session.
3. Login:
   - User requests login options.
   - Browser WebAuthn assertion runs.
   - Server verifies assertion, updates counter, creates session.
4. Logout clears cookie and redirects appropriately.

## Technical Requirements

### Database

1. `users` table exists.
2. `authenticators` table exists and links to users.

### API Endpoints

1. `POST /api/auth/register-options`
2. `POST /api/auth/register-verify`
3. `POST /api/auth/login-options`
4. `POST /api/auth/login-verify`
5. `POST /api/auth/logout`
6. `GET /api/auth/me`

### Auth Utilities

Implement/verify in `lib/auth.ts`:
1. `createSession`
2. `getSession`
3. `deleteSession`

Session requirements:
1. HTTP-only cookie
2. 7-day expiry
3. `Secure` in production
4. sensible `SameSite`

### Middleware and Route Protection

1. `middleware.ts` protects required routes (for example `/` and `/calendar`).
2. Unauthenticated access redirects to login.
3. Authenticated users can be redirected away from login page.

### WebAuthn Implementation Rules

1. Use `@simplewebauthn/server` and `@simplewebauthn/browser`.
2. Handle authenticator counter with null-safe fallback:

```typescript
counter: authenticator.counter ?? 0
```

3. Use correct base64url conversions for credential IDs.

## Validation and Error Handling

1. Validate usernames and request payloads.
2. Handle challenge mismatch and verification failures safely.
3. Return generic auth failure messages without leaking sensitive details.
4. Clear stale challenge/session state when appropriate.

## Acceptance Criteria (Feature 11)

1. Registration with passkey works.
2. Login with passkey works.
3. Session persists for 7 days.
4. Logout clears session immediately.
5. Protected routes are secured.

## Testing Requirements (Feature 11)

### E2E (Playwright)

1. Register new user using virtual authenticator.
2. Login existing user using virtual authenticator.
3. Logout clears session.
4. Protected routes redirect when unauthenticated.
5. Login page redirects if already authenticated.

### Unit Tests

1. JWT session create/verify logic.
2. Cookie option behavior by environment.
3. Counter fallback handling (`?? 0`).

### Integration Tests

1. Register options/verify flow.
2. Login options/verify flow.
3. `/api/auth/me` session resolution.
4. Logout invalidates session.

### Unit Tests

1. JWT session create/verify logic.
2. Cookie option behavior by environment.
3. Counter fallback handling (`?? 0`).

## Implementation Checklist

- [ ] users and authenticators tables exist
- [ ] register options endpoint implemented
- [ ] register verify endpoint implemented
- [ ] login options endpoint implemented
- [ ] login verify endpoint implemented
- [ ] logout endpoint implemented
- [ ] auth me endpoint implemented
- [ ] `lib/auth.ts` session utilities implemented
- [ ] `middleware.ts` route protection implemented
- [ ] login page implemented
- [ ] registration flow implemented
- [ ] login flow implemented
- [ ] logout action implemented
- [ ] HTTP-only cookie with 7-day expiry implemented
- [ ] protected routes redirect logic implemented

## Out of Scope

1. Password-based fallback authentication.
2. Multi-factor beyond passkeys.

---

Last Updated: April 8, 2026
PRP ID: 11
