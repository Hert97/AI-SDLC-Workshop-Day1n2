# PRP 07: Template System

## Overview
Save frequently-used todo configurations as reusable templates (with subtasks). Create todos instantly from a template.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Can save current todo as template
- [ ] Templates include all metadata
- [ ] Using template creates new todo
- [ ] Subtasks recreated from JSON
- [ ] Category filtering works

## Database Schema
```sql
CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  title_template TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_pattern TEXT,
  reminder_minutes INTEGER,
  subtasks_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```
`subtasks_json` stores: `JSON.stringify([{ title: string, position: number }])`

## API Endpoints

### GET /api/templates
Returns all templates for authenticated user.

### POST /api/templates
```typescript
// Request: { name, description?, category?, title_template, priority, is_recurring, recurrence_pattern?, reminder_minutes?, subtasks_json? }
// subtasks_json: JSON string of [{title, position}]
```

### PUT /api/templates/[id]
Update template fields.

### DELETE /api/templates/[id]
Delete template. Does NOT affect todos created from it.

### POST /api/templates/[id]/use
Create a new todo from template:
```typescript
const template = templateDB.getById(id);
// Create todo with template's settings
const todo = todoDB.create({
  user_id: session.userId,
  title: template.title_template,
  priority: template.priority,
  is_recurring: template.is_recurring,
  recurrence_pattern: template.recurrence_pattern ?? null,
  reminder_minutes: template.reminder_minutes ?? null,
  // Note: due_date NOT copied (user sets later)
});
// Create subtasks from JSON
const subtasks: Array<{title: string; position: number}> = JSON.parse(template.subtasks_json || '[]');
subtasks.forEach(sub => subtaskDB.create(todo.id, sub.title, sub.position));
return NextResponse.json(todo, { status: 201 });
```

## UI: Save as Template Button
Appears in the create form when title is non-empty:
```tsx
{newTodoTitle.trim() && (
  <button type="button" onClick={() => setShowSaveTemplate(true)}>
    💾 Save as Template
  </button>
)}
```

## UI: Save Template Modal
```tsx
<div className="modal">
  <h2>Save as Template</h2>
  <input placeholder="Template name (required)" value={templateName} onChange={...} />
  <input placeholder="Description (optional)" value={templateDesc} onChange={...} />
  <input placeholder="Category (optional)" value={templateCategory} onChange={...} />
  <button onClick={saveTemplate}>Save Template</button>
  <button onClick={() => setShowSaveTemplate(false)}>Cancel</button>
</div>
```

## UI: Use Template Dropdown
```tsx
<select onChange={e => useTemplate(Number(e.target.value))}>
  <option value="">Use Template...</option>
  {templates.map(t => (
    <option key={t.id} value={t.id}>
      {t.name}{t.category ? ` (${t.category})` : ''}
    </option>
  ))}
</select>
```

## UI: Template Manager Modal (📋 Templates button)
```tsx
{/* Category filter */}
<select value={categoryFilter} onChange={...}>
  <option value="">All Categories</option>
  {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
</select>

{/* Template list */}
{filteredTemplates.map(template => (
  <div key={template.id}>
    <div>
      <strong>{template.name}</strong>
      {template.description && <p>{template.description}</p>}
      {template.category && <span className="badge">{template.category}</span>}
      <span className={PRIORITY_CONFIG[template.priority].color}>{template.priority}</span>
      {template.is_recurring && <span>🔄 {template.recurrence_pattern}</span>}
      {template.reminder_minutes && <span>🔔 {REMINDER_BADGE_LABELS[template.reminder_minutes]}</span>}
    </div>
    <button onClick={() => useTemplate(template.id)}>Use</button>
    <button onClick={() => deleteTemplate(template.id)}>Delete</button>
  </div>
))}
```

## Testing Checklist
- [ ] E2E: Fill create form → Save as Template button appears
- [ ] E2E: Save template with name, description, category
- [ ] E2E: Template appears in Use Template dropdown
- [ ] E2E: Use template → todo created with correct settings
- [ ] E2E: Use template with subtasks → subtasks created
- [ ] E2E: Open Templates modal → all templates listed
- [ ] E2E: Filter templates by category
- [ ] E2E: Delete template from modal
- [ ] Unit: JSON.parse(subtasks_json) creates correct subtask array
