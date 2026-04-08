# PRP 02: Priority System

## Feature Overview

Implement a complete priority system for todos with three levels:
- High
- Medium
- Low

This PRP extends Todo CRUD behavior and aligns to Feature 02 criteria in EVALUATION.md, while matching user-facing behavior in USER_GUIDE.md.

## User Stories

1. As a user, I can assign High/Medium/Low priority when creating a todo.
2. As a user, I can edit priority later.
3. As a user, I can quickly identify urgency via color-coded badges.
4. As a user, I can filter todos by a chosen priority.
5. As a user, I can rely on automatic sorting so high-priority work appears first.

## User Flow

1. User opens create or edit todo form.
2. User selects priority from dropdown (`high`, `medium`, `low`).
3. On save, todo displays with color-coded badge.
4. Todo list auto-sorts with `high -> medium -> low` ordering.
5. User applies priority filter to view only one level.
6. User clears filter to return to full list.

## Technical Requirements

### Data Model

1. `todos.priority` column exists.
2. Allowed values: `high | medium | low`.
3. Default value: `medium`.
4. Shared type:

```typescript
export type Priority = 'high' | 'medium' | 'low';
```

### API Requirements

1. Create/update todo endpoints must validate priority.
2. Invalid priority returns `422` with clear message.
3. If priority omitted in create payload, API sets `medium`.
4. Read endpoints include `priority` in response.

### UI Requirements

1. Priority dropdown in create form.
2. Priority dropdown in edit form/modal.
3. Badge on each todo row/card.
4. Priority filter dropdown in toolbar/filter area.
5. Badge colors map to urgency:
   - High: red
   - Medium: yellow
   - Low: blue
6. Colors must remain legible in dark mode (WCAG AA target).

## Sorting and Filtering Rules

1. Base sort order by priority:
   - `high` first
   - `medium` second
   - `low` third
2. Secondary sort uses existing due date logic (if applicable).
3. Priority filter shows only selected priority.
4. Filter state can combine with existing search/tag filters if present.

## Validation and Error Handling

1. Reject unsupported priority values.
2. Return consistent API error shape on failure.
3. UI displays actionable validation message.
4. Optimistic updates (if enabled in page state) must rollback on failure.

## Acceptance Criteria (Feature 02)

1. Three priority levels are fully functional.
2. Color-coded badges are visible in todo list.
3. Automatic sorting by priority works correctly.
4. Filter shows only selected priority.
5. Badge contrast is WCAG AA compliant in light/dark themes.

## Testing Requirements (Feature 02)

### E2E (Playwright)

1. Create todo with each priority level.
2. Edit priority on existing todo.
3. Filter by priority.
4. Verify sort order: `high -> medium -> low`.
5. Visual regression/visual assertions for badge colors in light and dark mode.

### Integration Tests

1. API accepts valid priority values.
2. API rejects invalid priority value with `422`.
3. Create defaults to `medium` when omitted.
4. List endpoint returns priority field.

### Unit Tests

1. Priority comparator function ordering.
2. Priority-to-badge color mapping.
3. Filter predicate behavior.

## Implementation Checklist

- [ ] `priority` field present on todos table
- [ ] `Priority` type defined and reused
- [ ] API validation added for create/update
- [ ] default priority set to `medium`
- [ ] badge component implemented
- [ ] priority dropdown in create/edit UI
- [ ] priority filter dropdown in UI
- [ ] auto-sort by priority implemented
- [ ] dark mode badge contrast verified

## Out of Scope

1. Recurrence behaviors.
2. Reminder logic.
3. Tag-specific filters beyond compatibility.
4. Calendar visualization.

---

Last Updated: April 8, 2026
PRP ID: 02
