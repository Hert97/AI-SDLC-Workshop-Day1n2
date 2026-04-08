# PRP 02: Priority System

## Overview
Three-level priority (high/medium/low) with color-coded badges, automatic sorting, and filtering.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Three priority levels functional
- [ ] Color-coded badges visible
- [ ] Automatic sorting by priority works
- [ ] Filter shows only selected priority
- [ ] WCAG AA contrast compliance

## Type Definition
```typescript
export type Priority = 'high' | 'medium' | 'low';

export const PRIORITY_CONFIG = {
  high:   { label: 'High',   color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',    order: 0 },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', order: 1 },
  low:    { label: 'Low',    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', order: 2 },
} as const;
```

## Badge Component
Render inline next to todo title:
```tsx
<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[priority].color}`}>
  {PRIORITY_CONFIG[priority].label}
</span>
```

## Sorting Logic
```typescript
function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const pa = PRIORITY_CONFIG[a.priority].order;
    const pb = PRIORITY_CONFIG[b.priority].order;
    if (pa !== pb) return pa - pb;
    // then by due_date asc (nulls last)
    if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    // then by created_at desc
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
```

## Priority Filter Dropdown
```tsx
<select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
  <option value="">All Priorities</option>
  <option value="high">High Priority</option>
  <option value="medium">Medium Priority</option>
  <option value="low">Low Priority</option>
</select>
```
Filter is client-side using AND logic with other active filters.

## API Validation
In API routes, validate priority:
```typescript
const VALID_PRIORITIES = ['high', 'medium', 'low'];
if (priority && !VALID_PRIORITIES.includes(priority)) {
  return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
}
```

## Testing Checklist
- [ ] E2E: Create todo with High priority → red badge visible
- [ ] E2E: Create todo with Medium priority → yellow badge visible
- [ ] E2E: Create todo with Low priority → blue badge visible
- [ ] E2E: Edit todo to change priority
- [ ] E2E: Filter by "High Priority" → only high todos shown
- [ ] E2E: Verify sort order: high before medium before low
- [ ] Visual: Badge colors visible in light mode
- [ ] Visual: Badge colors visible in dark mode (prefers-color-scheme)
