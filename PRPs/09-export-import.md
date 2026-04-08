# PRP 09: Export & Import

## Feature Overview

Implement backup and restore of user todo data using JSON export/import with safe validation and relationship preservation.

This PRP aligns to Feature 09 criteria in EVALUATION.md and user expectations from USER_GUIDE.md.

## User Stories

1. As a user, I can export my data as JSON backup.
2. As a user, I can import previously exported data.
3. As a user, I can trust subtasks, tags, and relationships are preserved.
4. As a user, I see clear error messages for invalid files.

## User Flow

1. User clicks Export.
2. App downloads JSON file.
3. User clicks Import and selects JSON file.
4. App validates structure/version.
5. App imports data with id remapping and conflict-safe tag handling.
6. App shows success summary counts.

## Technical Requirements

### API Endpoints

1. `GET /api/todos/export`
2. `POST /api/todos/import`

### Export Format

1. JSON includes version field.
2. Includes todos, subtasks, tags, and associations.
3. Includes enough metadata to reconstruct relationships.

Suggested top-level shape:

```typescript
interface TodoExportPayload {
  version: string;
  exported_at: string;
  todos: unknown[];
  subtasks: unknown[];
  tags: unknown[];
  todo_tags: unknown[];
}
```

### Import Behavior

1. Validate JSON format and required fields.
2. Reject malformed payloads with clear errors.
3. Remap IDs to avoid collisions.
4. Preserve relationships after remapping.
5. Resolve tag name conflicts by reusing existing user tag where possible.
6. Imported todos appear immediately in UI after success.

## Validation and Error Handling

1. Invalid JSON returns friendly error (`400/422`).
2. Unsupported/missing version returns validation error.
3. Partial import failures should be handled transactionally when feasible.
4. UI shows success counts (imported todos/subtasks/tags).

## Acceptance Criteria (Feature 09)

1. Export creates valid JSON.
2. Import validates format before write.
3. Relationships are preserved.
4. Duplicate tags are not created unnecessarily.
5. Error messages are clear and actionable.

## Testing Requirements (Feature 09)

### E2E (Playwright)

1. Export todos.
2. Import valid file.
3. Import invalid JSON shows error.
4. Import preserves all data relationships.
5. Imported todos appear immediately.

### Unit Tests

1. ID remapping logic.
2. JSON schema/shape validation.
3. Tag conflict resolution behavior.

### Integration Tests

1. Export endpoint returns expected payload shape.
2. Import endpoint validates and persists correctly.
3. Import endpoint returns detailed success counts.

## Implementation Checklist

- [ ] `GET /api/todos/export` implemented
- [ ] `POST /api/todos/import` implemented
- [ ] export button in UI
- [ ] import button/file picker in UI
- [ ] JSON includes version field
- [ ] export contains todos/subtasks/tags/links
- [ ] import validation implemented
- [ ] id remapping implemented
- [ ] tag conflict resolution implemented
- [ ] success summary message implemented
- [ ] invalid JSON error handling implemented

## Out of Scope

1. Cross-app migration adapters.
2. Encrypted backup format.

---

Last Updated: April 8, 2026
PRP ID: 09
