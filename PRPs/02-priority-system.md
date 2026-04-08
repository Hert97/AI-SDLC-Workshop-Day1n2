# PRP-02: Priority System

## Feature Overview

The Priority System allows users to classify their todos into three importance levels — **High**, **Medium**, and **Low** — each with a distinct colour-coded badge. Todos are automatically sorted by priority so the most critical tasks always appear at the top of each section. A priority filter dropdown lets users narrow the list to a single priority level at any time.

This feature builds directly on the Todo CRUD foundation (PRP-01) and is consumed by Search & Filtering (PRP-08), Templates (PRP-07), and Recurring Todos (PRP-03).

---

## User Stories

| ID | As a… | I want to… | So that… |
|----|-------|-----------|----------|
| US-01 | Busy professional | assign a priority when I create a todo | I can focus on what matters most |
| US-02 | Daily planner | see colour-coded badges next to each todo | I can instantly gauge urgency at a glance |
| US-03 | Power user | filter the list to only high-priority items | I can work through my most critical tasks first |
| US-04 | Casual user | have medium priority set automatically | I don't have to choose a level every time |
| US-05 | Accessibility-conscious user | rely on more than just colour to identify priority | I can use the app even if I have colour blindness |

---

## User Flow

### Creating a Todo with Priority
1. User opens the "Add Todo" form.
2. User types a title (required).
3. User opens the **Priority** dropdown — options: `High`, `Medium` (selected by default), `Low`.
4. User selects a priority level.
5. User submits the form.
6. The new todo appears in the active list with the correct colour-coded badge.
7. The list re-sorts automatically: High → Medium → Low.

### Changing Priority on an Existing Todo
1. User clicks the **Edit** button on a todo.
2. The edit form opens, showing the current priority pre-selected in the dropdown.
3. User changes the priority.
4. User saves the form.
5. The todo moves to its new position in the sorted list.

### Filtering by Priority
1. User opens the **Priority Filter** dropdown (top of the todo list).
2. User selects `High`, `Medium`, or `Low`.
3. Only todos matching that priority are displayed.
4. Selecting `All` (default) removes the filter.
5. Priority filter stacks with search text and tag filters.

---

## Technical Requirements

### 1. Database Schema

Add the `priority` column to the `todos` table in `lib/db.ts`:

```sql
ALTER TABLE todos
ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low'));
```

> Handle the migration with a `try-catch` block because `ALTER TABLE … ADD COLUMN` fails if the column already exists.

```typescript
try {
  db.exec(`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'`);
} catch {
  // Column already exists — safe to ignore
}
```

### 2. Type Definitions (`lib/db.ts`)

```typescript
export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;          // NEW
  due_date: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  reminder_minutes: number | null;
  created_at: string;
  updated_at: string;
}
```

### 3. Database Query — Sort Order

All `SELECT` queries that return todo lists must order by priority first:

```sql
ORDER BY
  CASE priority
    WHEN 'high'   THEN 1
    WHEN 'medium' THEN 2
    WHEN 'low'    THEN 3
  END,
  due_date ASC NULLS LAST,
  created_at DESC
```

### 4. API Endpoints

#### `POST /api/todos` — Create Todo

**Request body additions:**
```json
{ "priority": "high" }
```

**Validation:**
```typescript
const VALID_PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const priority: Priority = VALID_PRIORITIES.includes(body.priority)
  ? body.priority
  : 'medium';
```

**Response:** The created todo object including `priority`.

---

#### `PUT /api/todos/[id]` — Update Todo

**Request body (partial update):**
```json
{ "priority": "low" }
```

**Validation:** Same enum check as POST. If the field is absent, retain the existing value.

**Response:** The updated todo object.

---

#### `GET /api/todos` — List Todos (with optional priority filter)

**Query parameters:**
| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `priority` | `string` (optional) | `high` | Return only todos with this priority |

**Example:**
```
GET /api/todos?priority=high
```

**SQL snippet:**
```sql
WHERE user_id = ?
  AND (? IS NULL OR priority = ?)
ORDER BY
  CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
  due_date ASC NULLS LAST,
  created_at DESC
```

---

### 5. Utility Helper

```typescript
// lib/priority.ts  (or inline in lib/db.ts)
export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
```

---

## UI Components

### Priority Badge

Render a colour-coded, accessible badge next to the todo title in all views (list, calendar, template preview).

```tsx
// components/PriorityBadge.tsx
import { Priority } from '@/lib/db';

const BADGE_STYLES: Record<Priority, string> = {
  high:   'bg-red-100    text-red-700    dark:bg-red-900    dark:text-red-200',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  low:    'bg-blue-100   text-blue-700   dark:bg-blue-900   dark:text-blue-200',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High', medium: 'Medium', low: 'Low',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE_STYLES[priority]}`}
      aria-label={`Priority: ${PRIORITY_LABEL[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
```

### Priority Dropdown (Create / Edit Form)

```tsx
<label htmlFor="priority" className="block text-sm font-medium">
  Priority
</label>
<select
  id="priority"
  name="priority"
  value={priority}
  onChange={(e) => setPriority(e.target.value as Priority)}
  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600
             bg-white dark:bg-gray-700 py-2 px-3 text-sm"
>
  <option value="high">🔴 High</option>
  <option value="medium">🟡 Medium</option>
  <option value="low">🔵 Low</option>
</select>
```

### Priority Filter Dropdown (Todo List Header)

```tsx
<select
  value={priorityFilter}
  onChange={(e) => setPriorityFilter(e.target.value)}
  aria-label="Filter by priority"
  className="rounded-md border border-gray-300 dark:border-gray-600 bg-white
             dark:bg-gray-700 py-1.5 px-2 text-sm"
>
  <option value="">All Priorities</option>
  <option value="high">🔴 High Priority</option>
  <option value="medium">🟡 Medium Priority</option>
  <option value="low">🔵 Low Priority</option>
</select>
```

> **Integration note:** In `app/page.tsx`, store `priorityFilter` in React state and pass it as a query param when fetching todos:
> ```typescript
> const url = `/api/todos${priorityFilter ? `?priority=${priorityFilter}` : ''}`;
> ```

---

## Edge Cases

| Scenario | Expected Behaviour |
|----------|--------------------|
| `priority` field absent from POST body | Default to `'medium'` |
| Invalid priority value (e.g. `"critical"`) | Reject with `400 Bad Request`: `"Invalid priority value"` |
| Priority filter value not in enum | Ignore filter, return all todos |
| Todos with the same priority and no due date | Sort by `created_at DESC` (newest first) |
| Recurring todo completion | Next instance inherits the same priority level |
| Template instantiation | New todo inherits template's priority |
| Export / Import | `priority` field included in JSON; validated on import |
| Dark mode | Badge background and text colours must satisfy WCAG AA contrast (≥ 4.5:1) |

---

## Acceptance Criteria

Based on **EVALUATION.md – Feature 02: Priority System**:

- [ ] **Three priority levels functional** — `high`, `medium`, and `low` can each be set, saved, and retrieved
- [ ] **Default is `medium`** — a todo created without an explicit priority is assigned `medium`
- [ ] **Type definition** — `type Priority = 'high' | 'medium' | 'low'` exported from `lib/db.ts`
- [ ] **API validation** — invalid priority values are rejected with HTTP 400
- [ ] **Priority badge component** — badges render in red / yellow / blue in both light and dark mode
- [ ] **Priority dropdown** — present in both the create form and the edit form
- [ ] **Automatic sorting** — todos sorted High → Medium → Low within each display section (Overdue, Active, Completed)
- [ ] **Priority filter** — selecting a priority in the filter dropdown shows only matching todos
- [ ] **Filter stacking** — priority filter works alongside search text and tag filters
- [ ] **WCAG AA compliance** — all badge colour combinations meet ≥ 4.5:1 contrast ratio

---

## Testing Requirements

### E2E Tests (`tests/02-priority-system.spec.ts`)

| Test | Steps | Expected |
|------|-------|----------|
| Create with High priority | Register → Create todo → select High → save | Badge shows "High" in red |
| Create with Low priority | Create todo → select Low → save | Badge shows "Low" in blue |
| Default priority | Create todo without choosing priority | Badge shows "Medium" in yellow |
| Edit priority | Create Medium todo → Edit → change to High → save | Badge updates; todo moves to top |
| Filter High | Create High + Low todos → select High filter | Only High todo visible |
| Filter clears | Select High filter → select All | Both todos visible again |
| Sort order | Create Low, then Medium, then High todos | Display order: High → Medium → Low |
| Dark mode badges | Toggle dark mode | Badge colours remain legible |

### Unit / Integration Tests

- `Priority` type accepts only `'high' | 'medium' | 'low'`
- `POST /api/todos` with missing `priority` returns todo with `priority: 'medium'`
- `POST /api/todos` with `priority: 'critical'` returns HTTP 400
- `GET /api/todos?priority=high` returns only high-priority todos
- Database ORDER BY returns High before Medium before Low

---

## Out of Scope

- Custom priority labels (e.g. renaming "High" to "Urgent") — not supported in this version
- More than three priority levels — the type is intentionally constrained
- Priority-based colour themes for the entire todo card — only the badge is coloured
- Server-side push notifications based on priority changes

---

## Success Metrics

| Metric | Target |
|--------|--------|
| All E2E tests pass | 100% |
| Badge contrast ratio (light + dark) | ≥ 4.5:1 (WCAG AA) |
| Default priority applied to all new todos | 100% |
| Filter accuracy (precision & recall) | 100% |
| Sort order correctness | High always before Medium, Medium before Low |

---

## Related Files

| File | Role |
|------|------|
| `lib/db.ts` | `Priority` type, `Todo` interface, DB migration, CRUD with sort |
| `app/api/todos/route.ts` | POST with priority validation; GET with priority filter |
| `app/api/todos/[id]/route.ts` | PUT priority update |
| `app/page.tsx` | Priority dropdown, badge rendering, filter state |
| `tests/02-priority-system.spec.ts` | E2E test suite |

---

*References: [README.md – Verify Core Features § Todo CRUD](../README.md#7-verify-core-features) · [EVALUATION.md – Feature 02: Priority System](../EVALUATION.md#-feature-02-priority-system) · [USER_GUIDE.md – Priority Levels](../USER_GUIDE.md#3-priority-levels)*
