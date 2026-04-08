# PRP 10: Calendar View

## Feature Overview

Implement a monthly calendar page that visualizes todos by due date and includes Singapore public holidays.

This PRP aligns to Feature 10 criteria in EVALUATION.md and user-facing expectations in USER_GUIDE.md.

## User Stories

1. As a user, I can view todos on a monthly calendar.
2. As a user, I can navigate to previous/next months and jump to today.
3. As a user, I can see Singapore holidays in the calendar.
4. As a user, I can click a day to inspect that day's todos.

## User Flow

1. User opens `/calendar`.
2. Current month grid is shown.
3. User navigates month with prev/next controls.
4. User clicks `Today` to return to current month.
5. Day cells show todo indicators/counts and holidays.
6. User clicks a day cell to open modal/list of that day’s todos.

## Technical Requirements

### Data and API

1. Holidays table exists and is seeded for Singapore public holidays.
2. `GET /api/holidays` returns holiday data for visible month(s).
3. Todo due dates are mapped by Singapore timezone date.

### Route and State

1. Calendar route exists at `/calendar`.
2. URL query state tracks month: `?month=YYYY-MM`.

### UI Requirements

1. Calendar grid with week layout and day headers (Sun-Sat).
2. Current day highlight.
3. Weekend styling.
4. Holiday labels within day cells.
5. Todo count badge or markers per day.
6. Day click opens modal/panel with day’s todos.

### Date/Timezone Rules

1. All calendar date calculations use Singapore timezone logic.
2. Holiday matching and todo placement use Singapore local date boundaries.

## Acceptance Criteria (Feature 10)

1. Calendar renders correctly for selected month.
2. Singapore holidays are displayed.
3. Todos appear on correct due dates.
4. Navigation controls work correctly.
5. Day modal shows todos for clicked date.

## Testing Requirements (Feature 10)

### E2E (Playwright)

1. Calendar loads current month.
2. Navigate previous/next month.
3. Today button returns to current month.
4. Todo appears on correct calendar day.
5. Holiday appears on correct day.
6. Clicking day opens modal.

### Unit Tests

1. Calendar grid generation for month boundaries.
2. Date key generation in Singapore timezone.
3. Month query parsing/serialization (`YYYY-MM`).

### Integration Tests

1. `GET /api/holidays` returns expected shape and date values.
2. Todo-to-day mapping uses Singapore date semantics.

## Implementation Checklist

- [ ] holidays table seeded with Singapore holidays
- [ ] `GET /api/holidays` endpoint implemented
- [ ] `/calendar` route implemented
- [ ] calendar generation logic implemented
- [ ] prev/next/today controls implemented
- [ ] day headers (Sun-Sat) implemented
- [ ] current day highlighting implemented
- [ ] weekend styling implemented
- [ ] holiday display implemented
- [ ] todos displayed by due date
- [ ] todo count badge on day cells
- [ ] day click modal implemented
- [ ] URL month state (`?month=YYYY-MM`) implemented

## Out of Scope

1. Week and agenda views.
2. Drag-and-drop scheduling.

---

Last Updated: April 8, 2026
PRP ID: 10
