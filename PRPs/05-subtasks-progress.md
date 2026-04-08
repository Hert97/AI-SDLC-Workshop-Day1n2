# PRP 05: Subtasks & Progress Tracking

## Overview
Break todos into smaller checklist items with a visual progress bar showing completion percentage.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Can add unlimited subtasks
- [ ] Can toggle completion
- [ ] Progress updates in real-time
- [ ] Visual progress bar accurate
- [ ] Cascade delete works

## Database Schema
```sql
CREATE TABLE subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

### POST /api/todos/[id]/subtasks
Create a new subtask. Auto-assigns position = max(position) + 1.
```typescript
// Request: { title: string }
// Response: 201, created subtask
```

### PUT /api/subtasks/[id]
Toggle completion or update title.
```typescript
// Request: { completed?: boolean, title?: string }
// Response: 200, updated subtask
```

### DELETE /api/subtasks/[id]
Delete a single subtask. Returns 204.

## Progress Calculation
```typescript
export function calculateProgress(subtasks: Subtask[]): { completed: number; total: number; percent: number } {
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.completed).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
```

## UI Components

### Progress Bar (visible even when subtasks collapsed)
```tsx
{subtasks.length > 0 && (
  <div>
    <div className="text-xs text-gray-500">{completed}/{total} subtasks</div>
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${percent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
)}
```

### Subtasks Section (toggle expand/collapse)
```tsx
<button onClick={() => setExpanded(!expanded)}>
  {expanded ? '▼' : '▶'} Subtasks
</button>
{expanded && (
  <div>
    {subtasks.map(subtask => (
      <div key={subtask.id} className="flex items-center gap-2">
        <input type="checkbox" checked={subtask.completed} onChange={() => toggleSubtask(subtask.id)} />
        <span className={subtask.completed ? 'line-through text-gray-400' : ''}>{subtask.title}</span>
        <button onClick={() => deleteSubtask(subtask.id)}>✕</button>
      </div>
    ))}
    <form onSubmit={addSubtask}>
      <input placeholder="Add subtask..." value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} />
      <button type="submit">Add</button>
    </form>
  </div>
)}
```

## Data Fetching
Subtasks are included in GET /api/todos response:
```typescript
// In todoDB.getAll():
const todos = db.prepare('SELECT * FROM todos WHERE user_id = ?').all(userId);
return todos.map(todo => ({
  ...todo,
  subtasks: db.prepare('SELECT * FROM subtasks WHERE todo_id = ? ORDER BY position').all(todo.id),
  tags: db.prepare('SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?').all(todo.id),
}));
```

## Testing Checklist
- [ ] E2E: Expand subtasks section on a todo
- [ ] E2E: Add a subtask → appears in list
- [ ] E2E: Add multiple subtasks → all appear
- [ ] E2E: Toggle subtask checkbox → progress bar updates
- [ ] E2E: Complete all subtasks → progress bar turns green at 100%
- [ ] E2E: Delete subtask → progress recalculates
- [ ] E2E: Delete parent todo → subtasks also deleted (CASCADE)
- [ ] Unit: calculateProgress([]) === { completed: 0, total: 0, percent: 0 }
- [ ] Unit: calculateProgress([{completed:1},{completed:0}]) === { completed:1, total:2, percent:50 }
