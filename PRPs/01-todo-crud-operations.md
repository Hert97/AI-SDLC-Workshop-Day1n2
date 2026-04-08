# PRP 01: Todo CRUD Operations

## Feature Overview

Implement full Create, Read, Update, and Delete operations for todos as the core product workflow.

This PRP aligns to Feature 01 criteria in EVALUATION.md and follows user-facing behavior in USER_GUIDE.md.

## User Stories

1. As a user, I can create a todo with only a title.
2. As a user, I can optionally set priority, due date, recurring settings, and reminder.
3. As a user, I can view todos grouped by status (Overdue, Active, Completed).
4. As a user, I can edit existing todos.
5. As a user, I can mark a todo complete or incomplete.
6. As a user, I can delete a todo with confirmation.

## User Flow

1. User enters a title in the create form.
2. User optionally sets metadata (priority, due date, recurring, reminder).
3. User clicks Add and sees optimistic UI update.
4. Todo appears in the correct section and sort order.
5. User can edit the todo from an edit modal/form.
6. User can toggle completion via checkbox.
7. User can delete a todo after confirmation.

## Technical Requirements

### Data Model

1. `todos` table exists with core fields for title, status, timestamps, and user ownership.
2. Todo supports metadata fields used across features (priority, due_date, recurrence, reminder).
3. Relationships must support cascade behavior for child records (subtasks and tag links).

### API Endpoints

1. `POST /api/todos` creates todo.
2. `GET /api/todos` returns all todos for current user.
3. `GET /api/todos/[id]` returns one todo.
4. `PUT /api/todos/[id]` updates todo.
5. `DELETE /api/todos/[id]` deletes todo.
6. All endpoints scope data by authenticated `userId`.

### Validation Rules

1. Title is required, trimmed, and non-empty.
2. Due date (if provided) must be at least 1 minute in the future.
3. Date/time validation must use Singapore timezone utilities (`Asia/Singapore`).
4. Invalid payloads return clear `422` errors.

### UI Requirements

1. Create form at top of page with title, priority, due-date input, and add action.
2. Todo list grouped into Overdue, Active, and Completed sections.
3. Completion checkbox per todo.
4. Edit modal/form for updates.
5. Delete confirmation before destructive action.
6. Optimistic updates with rollback on API failure.

## Sorting and Display Rules

1. Todos sorted by priority and due date.
2. Overdue todos displayed in Overdue section.
3. Completed todos move to Completed section.
4. Time messaging follows urgency behavior from USER_GUIDE (overdue, due soon, due later).

## Validation and Error Handling

1. Return actionable field-level errors for invalid title/due date.
2. Handle network/API failures without losing local UI consistency.
3. Reject access to todos outside current user scope.

## Acceptance Criteria (Feature 01)

1. User can create todo with title only.
2. User can create todo with priority, due date, recurring, and reminder metadata.
3. Todos sort by priority and due date.
4. Completed todos move to Completed section.
5. Deleting todo cascades to subtasks and tag associations.

## Testing Requirements (Feature 01)

### E2E (Playwright)

1. Create todo with title only.
2. Create todo with all metadata.
3. Edit todo.
4. Toggle completion.
5. Delete todo.
6. Validate rejection for past due date.

### Integration Tests

1. CRUD endpoint coverage for success and validation errors.
2. User scoping enforcement in all endpoints.
3. Cascade delete behavior verification.

### Unit Tests

1. Title trim and non-empty validation.
2. Singapore-time due-date validation logic.
3. Sort comparator for priority and due date ordering.

## Implementation Checklist

- [ ] database schema contains required todo fields
- [ ] `POST /api/todos` implemented
- [ ] `GET /api/todos` implemented
- [ ] `GET /api/todos/[id]` implemented
- [ ] `PUT /api/todos/[id]` implemented
- [ ] `DELETE /api/todos/[id]` implemented
- [ ] Singapore timezone due-date validation implemented
- [ ] title validation (non-empty, trimmed) implemented
- [ ] minimum future due date validation implemented
- [ ] create form implemented
- [ ] Overdue/Active/Completed sections implemented
- [ ] completion toggle implemented
- [ ] edit modal/form implemented
- [ ] delete confirmation implemented
- [ ] optimistic updates with rollback implemented

## Out of Scope

1. Advanced search/filter behavior (Feature 08).
2. Calendar page behavior (Feature 10).
3. Passkey auth flow details (Feature 11).

---

Last Updated: April 8, 2026
PRP ID: 01