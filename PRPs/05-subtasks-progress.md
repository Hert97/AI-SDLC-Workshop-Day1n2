# PRP 05: Subtasks & Progress Tracking

## Feature Overview

Implement subtasks as checklist items under a todo, with live progress tracking and visual progress indicators.

This PRP aligns to Feature 05 criteria in EVALUATION.md and expected UX from USER_GUIDE.md.

## User Stories

1. As a user, I can expand a todo to manage subtasks.
2. As a user, I can add multiple subtasks quickly.
3. As a user, I can mark subtasks complete/incomplete.
4. As a user, I can delete subtasks.
5. As a user, I can track completion progress with text and bar indicators.

## User Flow

1. User opens Subtasks section on a todo.
2. User enters subtask title and adds items.
3. User toggles subtask completion checkboxes.
4. UI updates progress instantly (`X/Y`, percentage bar).
5. User deletes subtasks as needed.
6. If parent todo is deleted, all subtasks are removed automatically.

## Technical Requirements

### Data Model

1. `subtasks` table exists with `todo_id` foreign key.
2. CASCADE delete from `todos` to `subtasks` is enforced.
3. Subtask records include completion state and position for ordering.

### API Endpoints

1. `POST /api/todos/[id]/subtasks` creates subtask.
2. `PUT /api/subtasks/[id]` updates subtask (title/completion/position).
3. `DELETE /api/subtasks/[id]` deletes subtask.

### UI Requirements

1. Expand/collapse subtasks section on each todo.
2. Input field to add subtask.
3. Checkbox for completion toggle per subtask.
4. Delete button for subtask removal.
5. Progress text (`X/Y completed` and percentage).
6. Progress bar:
   - blue when progress < 100%
   - green when progress = 100%

### Progress Calculation

Use:

`(completed_subtasks / total_subtasks) * 100`

Handle zero-subtask case safely.

## Validation and Error Handling

1. Subtask title must be non-empty after trim.
2. Preserve ordering on create/delete/reorder operations.
3. Reject edits on subtasks outside current user's ownership scope.
4. Keep optimistic UI consistent with rollback on failure.

## Acceptance Criteria (Feature 05)

1. User can add unlimited subtasks.
2. User can toggle subtask completion.
3. Progress updates in real time.
4. Visual progress bar is accurate.
5. Deleting parent todo cascades to subtasks.

## Testing Requirements (Feature 05)

### E2E (Playwright)

1. Expand subtasks section.
2. Add multiple subtasks.
3. Toggle subtask completion.
4. Verify progress bar updates.
5. Delete subtask.
6. Delete todo and verify subtasks are deleted.

### Integration Tests

1. Subtask CRUD endpoints.
2. CASCADE delete behavior on parent todo removal.
3. Position persistence and ordering behavior.

### Unit Tests

1. Progress percentage calculation.
2. Completed/total text formatting.
3. Zero-total edge case handling.

## Implementation Checklist

- [ ] `subtasks` table with CASCADE delete implemented
- [ ] `POST /api/todos/[id]/subtasks` implemented
- [ ] `PUT /api/subtasks/[id]` implemented
- [ ] `DELETE /api/subtasks/[id]` implemented
- [ ] expandable subtasks UI implemented
- [ ] add-subtask input implemented
- [ ] subtask checkboxes implemented
- [ ] delete-subtask action implemented
- [ ] progress bar component implemented
- [ ] progress formula implemented
- [ ] progress text (`X/Y completed (Z%)`) implemented
- [ ] progress bar color rule (green at 100%, blue otherwise) implemented

## Out of Scope

1. Nested subtasks (subtasks of subtasks).
2. Cross-todo shared checklist items.
3. Time tracking per subtask.

---

Last Updated: April 8, 2026
PRP ID: 05