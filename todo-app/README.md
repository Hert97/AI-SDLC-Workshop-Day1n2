# Todo App (PRP Scaffold)

This app is generated from the PRPs in the workspace and provides a working, scalable baseline.

## Run

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - Copy `.env.example` to `.env.local`
3. Seed Singapore holidays (optional):
   - `npm run seed:holidays`
4. Start dev server:
   - `npm run dev`

## Suggested Scalable Structure

- `app/` App Router pages and API routes
- `lib/` database, auth, timezone, hooks
- `scripts/` maintenance and seed scripts
- `tests/` Playwright E2E tests

## Implemented PRP Coverage

- Feature 01: CRUD baseline
- Feature 02: Priority field and sorting
- Feature 03: Recurrence creation on completion
- Feature 04: Reminder check endpoint + browser notification hook
- Feature 05: Subtask endpoints
- Feature 06: Tag CRUD + assignment
- Feature 07: Template CRUD + use
- Feature 08: Search/filter UI baseline
- Feature 09: Export/import endpoints
- Feature 10: Calendar page + holidays API
- Feature 11: Auth routes + session middleware

## Notes

- Auth routes are structured for passkey flow and can be hardened with full WebAuthn attestation/assertion validation.
- All date/time handling is routed through Singapore timezone utilities in `lib/timezone.ts`.
