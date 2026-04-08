# PRP 03: Recurring Todos

## Overview
Automatically create the next instance of a todo when the current one is completed. Supports daily, weekly, monthly, and yearly patterns.

## Acceptance Criteria (from EVALUATION.md)
- [ ] All four patterns work correctly
- [ ] Next instance created on completion
- [ ] Metadata inherited properly
- [ ] Date calculations accurate (Singapore timezone)
- [ ] Can disable recurring on existing todo

## Type Definition
```typescript
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
```

## Database Fields
```sql
is_recurring INTEGER NOT NULL DEFAULT 0,
recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily','weekly','monthly','yearly'))
```
Validation: if `is_recurring = 1`, `recurrence_pattern` must be set and `due_date` must exist.

## Due Date Calculation
```typescript
import { getSingaporeNow } from '@/lib/timezone';

export function calculateNextDueDate(currentDueDate: string, pattern: RecurrencePattern): string {
  const d = new Date(currentDueDate);
  switch (pattern) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
  }
  return d.toISOString();
}
```

## Completion Logic (PUT /api/todos/[id])
When `completed` is set to `true` and `is_recurring = 1`:
```typescript
// 1. Mark current todo as completed
todoDB.update(id, { completed: 1 });

// 2. Create next instance
const nextDueDate = calculateNextDueDate(todo.due_date!, todo.recurrence_pattern!);
const currentTags = tagDB.getForTodo(id);
const newTodo = todoDB.create({
  user_id: todo.user_id,
  title: todo.title,
  priority: todo.priority,
  is_recurring: 1,
  recurrence_pattern: todo.recurrence_pattern,
  reminder_minutes: todo.reminder_minutes ?? null,
  due_date: nextDueDate,
});
// 3. Copy tags to new todo
currentTags.forEach(tag => tagDB.addToTodo(newTodo.id, tag.id));
```

## UI Components

### Form Fields
```tsx
<label>
  <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
  Repeat
</label>
{isRecurring && (
  <select value={recurrencePattern} onChange={e => setRecurrencePattern(e.target.value)}>
    <option value="daily">Daily</option>
    <option value="weekly">Weekly</option>
    <option value="monthly">Monthly</option>
    <option value="yearly">Yearly</option>
  </select>
)}
```
Note: "Repeat" checkbox should only be enabled when a due date is set.

### Recurrence Badge
```tsx
{todo.is_recurring && (
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-900 dark:text-purple-200">
    🔄 {todo.recurrence_pattern}
  </span>
)}
```

## Validation
- Recurring todos MUST have a due_date
- recurrence_pattern is required when is_recurring is true
- If due_date is removed from a recurring todo, disable recurring

## Testing Checklist
- [ ] E2E: Create daily recurring todo
- [ ] E2E: Create weekly recurring todo with due date
- [ ] E2E: Complete recurring todo → new instance appears in Pending
- [ ] E2E: New instance has correct due date (+7d for weekly)
- [ ] E2E: New instance inherits priority, tags, reminder, pattern
- [ ] E2E: Disabling "Repeat" on existing recurring todo works
- [ ] Unit: calculateNextDueDate('2026-01-01', 'daily') === '2026-01-02'
- [ ] Unit: calculateNextDueDate('2026-01-31', 'monthly') === '2026-02-28' (edge: month end)
