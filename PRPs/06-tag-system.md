# PRP 06: Tag System

## Overview
User-specific color-coded labels with many-to-many relationship to todos. Full CRUD with tag management modal.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Tags unique per user
- [ ] Custom colors work
- [ ] Editing tag updates all todos
- [ ] Deleting tag removes from todos
- [ ] Filter works correctly

## Database Schema
```sql
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, name)
);

CREATE TABLE todo_tags (
  todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (todo_id, tag_id)
);
```

## API Endpoints

### GET /api/tags
Returns all tags for authenticated user.

### POST /api/tags
```typescript
// Request: { name: string, color: string }
// Validation: name non-empty, unique per user
// Response: 201, created tag
```

### PUT /api/tags/[id]
```typescript
// Request: { name?: string, color?: string }
// Ensures ownership (tag.user_id === session.userId)
// Response: 200, updated tag
```

### DELETE /api/tags/[id]
Deletes tag. `todo_tags` rows removed by CASCADE. Returns 204.

### POST /api/todos/[id]/tags
Assign tag to todo.
```typescript
// Request: { tagId: number }
// INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
```

### DELETE /api/todos/[id]/tags
Remove tag from todo.
```typescript
// Request body: { tagId: number }
// DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?
```

## UI: Tag Management Modal

### Open: "Manage Tags" button near todo form

```tsx
<div className="modal">
  <h2>Manage Tags</h2>
  {/* Create form */}
  <form onSubmit={createTag}>
    <input placeholder="Tag name" value={tagName} onChange={...} />
    <input type="color" value={tagColor} onChange={...} />
    <input type="text" value={tagColor} onChange={...} placeholder="#3B82F6" />
    <button type="submit">Create Tag</button>
  </form>
  {/* Tag list */}
  {tags.map(tag => (
    <div key={tag.id}>
      <span style={{ backgroundColor: tag.color }} className="tag-pill">{tag.name}</span>
      <button onClick={() => startEdit(tag)}>Edit</button>
      <button onClick={() => deleteTag(tag.id)}>Delete</button>
    </div>
  ))}
</div>
```

## UI: Tag Selection in Todo Form/Edit
```tsx
{tags.map(tag => (
  <button
    key={tag.id}
    type="button"
    onClick={() => toggleTag(tag.id)}
    className={selectedTagIds.includes(tag.id) ? 'tag-selected' : 'tag-unselected'}
    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
  >
    {selectedTagIds.includes(tag.id) && '✓ '}
    {tag.name}
  </button>
))}
```

## UI: Tag Badges on Todo
```tsx
{todo.tags.map(tag => (
  <button
    key={tag.id}
    onClick={() => setTagFilter(tag.id)}
    style={{ backgroundColor: tag.color }}
    className="px-2 py-0.5 rounded-full text-xs text-white font-medium"
  >
    {tag.name}
  </button>
))}
```
Clicking a tag badge activates the tag filter.

## Tag Filter
```tsx
<select value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
  <option value="">All Tags</option>
  {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
</select>
```

Filter logic (client-side):
```typescript
const filtered = todos.filter(todo =>
  !tagFilter || todo.tags.some(t => t.id === Number(tagFilter))
);
```

## Testing Checklist
- [ ] E2E: Create tag with name and color
- [ ] E2E: Edit tag name → badge updates on all todos
- [ ] E2E: Edit tag color → badge color updates
- [ ] E2E: Delete tag → removed from all todos
- [ ] E2E: Assign multiple tags to a todo
- [ ] E2E: Click tag badge → tag filter activates
- [ ] E2E: Filter by tag → only tagged todos shown
- [ ] E2E: Duplicate tag name blocked (unique constraint)
- [ ] Unit: tagDB.create fails if duplicate name for same user
