# PRP 01: Todo CRUD Operations

## Overview
Implement full Create, Read, Update, Delete operations for todos with Singapore timezone support, validation, and a polished UI.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Can create todo with just title
- [ ] Can create todo with priority, due date, recurring, reminder
- [ ] Todos sorted by priority and due date
- [ ] Completed todos move to Completed section
- [ ] Delete cascades to subtasks and tags

## Database Schema

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high','medium','low')),
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly')),
  reminder_minutes INTEGER,
  last_notification_sent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

### POST /api/todos
**Request body:**
```json
{ "title": "string (required)", "due_date": "ISO string (optional)", "priority": "high|medium|low", "is_recurring": false, "recurrence_pattern": null, "reminder_minutes": null }
```
**Validation rules:**
- `title` must be non-empty after trimming
- `due_date` if provided must be at least 1 minute in the future (Singapore time)
- `priority` defaults to `'medium'`

**Response:** `201` with created todo object

### GET /api/todos
Returns all todos for authenticated user, sorted by: priority (high→medium→low) then due_date asc then created_at desc.

**Response:** `200` with array of todos (each with `subtasks` and `tags` arrays)

### GET /api/todos/[id]
Returns single todo with subtasks and tags.

### PUT /api/todos/[id]
Updates todo. If completing a recurring todo, creates next instance with:
- Same title, priority, recurrence settings, tags, reminder
- Due date incremented by pattern (daily=+1d, weekly=+7d, monthly=+1mo, yearly=+1yr)

### DELETE /api/todos/[id]
Hard deletes todo. SQLite CASCADE handles subtasks and todo_tags.

## UI Components

### Create Form (top of page)
```
[Title input________________] [Priority▼] [Date picker] [Add]
[Tag pills if tags exist]
[💾 Save as Template] [Use Template▼]  (appear when title filled)
```

### Todo Item Display
```
[☐] Title  [🔴 High] [🔄 weekly] [🔔 1h]  [Tag1] [Tag2]
     Due in 2 days (Sat 10 Apr 2:00 PM)
     [====50%====] 3/6 subtasks
     [▶ Subtasks]  [Edit]  [Delete]
```

### Three Sections
1. **Overdue (X)** – red bg – todos past due_date, not completed
2. **Pending (X)** – gray bg – future/no due date, not completed  
3. **Completed (X)** – standard bg – completed todos

### Sort Order (within each section)
1. priority: high (0) < medium (1) < low (2)
2. due_date: ascending (nulls last)
3. created_at: descending

## Timezone Handling
All due_date comparisons must use Singapore timezone (`Asia/Singapore`, UTC+8).
```typescript
import { getSingaporeNow } from '@/lib/timezone';
const now = getSingaporeNow();
// Compare: new Date(todo.due_date) < now → overdue
```

## Validation Rules
- Title: required, trim whitespace, max 500 chars
- Due date: must be > now + 1 minute (in SGT)
- Priority: enum validation server-side

## Error Responses
```json
{ "error": "Title is required" }           // 400
{ "error": "Due date must be in future" }  // 400
{ "error": "Not authenticated" }           // 401
{ "error": "Todo not found" }              // 404
```

## Testing Checklist
- [ ] E2E: Create todo with title only
- [ ] E2E: Create todo with all metadata (priority, due date, recurrence, reminder)
- [ ] E2E: Edit todo title and priority
- [ ] E2E: Toggle completion → todo moves to Completed section
- [ ] E2E: Delete todo → removed from list
- [ ] E2E: Past due date validation shows error
- [ ] E2E: Verify sort order (high priority first)
- [ ] E2E: Overdue todo appears in Overdue section
