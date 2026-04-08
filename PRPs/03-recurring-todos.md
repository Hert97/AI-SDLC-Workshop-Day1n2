# PRP 03: Recurring Todos

## Feature Overview

Implement recurring todo behavior so users can create repeating tasks with daily, weekly, monthly, or yearly schedules.

This PRP aligns to Feature 03 in EVALUATION.md and mirrors user-facing usage from USER_GUIDE.md.

## User Stories

1. As a user, I can mark a todo as recurring.
2. As a user, I can choose a recurrence pattern (daily/weekly/monthly/yearly).
3. As a user, I understand recurring todos through a clear UI badge.
4. As a user, when I complete a recurring todo, the next instance is created automatically.
5. As a user, the new instance retains key metadata.

## User Flow

1. User creates or edits a todo.
2. User enables `Repeat` checkbox.
3. User chooses recurrence pattern.
4. User sets due date (required for recurring).
5. Todo shows recurring badge (for example `🔄 weekly`).
6. User marks todo complete.
7. System creates next todo instance with calculated due date and inherited metadata.

## Technical Requirements

### Data Model

1. `todos.is_recurring` boolean-like field.
2. `todos.recurrence_pattern` enum-like text:

```typescript
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

3. Recurring todos require `due_date`.

### Validation Rules

1. If `is_recurring = true`, `due_date` is required.
2. If `is_recurring = true`, `recurrence_pattern` is required and must be valid.
3. If `is_recurring = false`, `recurrence_pattern` may be null.

### Completion Behavior

When a recurring todo is completed:
1. Mark current todo completed.
2. Create next todo instance.
3. Compute next due date from current due date and selected pattern.
4. Inherit metadata:
   - priority
   - reminder_minutes
   - recurrence settings
   - assigned tags

### Date/Timezone Rules

1. Date calculations must use Singapore timezone utilities from `lib/timezone.ts`.
2. Pattern logic:
   - Daily: +1 day
   - Weekly: +7 days
   - Monthly: +1 calendar month
   - Yearly: +1 calendar year

### UI Requirements

1. Repeat checkbox in create/edit forms.
2. Recurrence pattern dropdown.
3. Recurring badge on todo item with pattern label.
4. Option to disable recurrence for existing todo.

## Error Handling

1. Return `422` for invalid recurrence payload.
2. Return clear error when recurring todo is missing due date.
3. If next-instance creation fails, keep behavior transactional (no partial corruption).

## Acceptance Criteria (Feature 03)

1. All four patterns work correctly.
2. Next instance is created on completion.
3. Metadata is inherited correctly.
4. Date calculations are accurate in Singapore timezone.
5. Recurrence can be disabled on existing todo.

## Testing Requirements (Feature 03)

### E2E (Playwright)

1. Create daily recurring todo.
2. Create weekly recurring todo.
3. Complete recurring todo and verify next instance creation.
4. Verify next instance due date correctness.
5. Verify inherited metadata on next instance.

### Unit Tests

1. Due-date calculation utility for each pattern.
2. End-of-month and leap-year boundaries for monthly/yearly patterns.
3. Validation logic for recurring-without-due-date case.

### Integration Tests

1. API validation for recurring fields.
2. Completion endpoint/path creates next instance.
3. Inherited metadata persistence verification.

## Implementation Checklist

- [ ] `is_recurring` and `recurrence_pattern` fields in DB
- [ ] `RecurrencePattern` type defined
- [ ] validation: recurring requires due date
- [ ] Repeat checkbox in create/edit UI
- [ ] recurrence dropdown
- [ ] completion creates next instance
- [ ] due date calculation logic for all patterns
- [ ] priority/tags/reminder/recurrence inheritance
- [ ] recurring badge with pattern label

## Out of Scope

1. Reminder notification delivery timing (covered by Feature 04).
2. Calendar visualization (covered by Feature 10).

---

Last Updated: April 8, 2026
PRP ID: 03
