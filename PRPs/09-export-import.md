# PRP 09: Export & Import

## Overview
Export todos to JSON (importable) or CSV (spreadsheet-friendly). Import from JSON, remapping IDs and preserving relationships.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Export creates valid JSON
- [ ] Import validates format
- [ ] All relationships preserved
- [ ] No duplicate tags created
- [ ] Error messages clear

## API: GET /api/todos/export
```typescript
// Query param: ?format=json (default) or ?format=csv
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const format = request.nextUrl.searchParams.get('format') ?? 'json';
  const todos = todoDB.getAll(session.userId); // includes subtasks and tags

  if (format === 'csv') {
    const rows = [
      ['ID', 'Title', 'Completed', 'Due Date', 'Priority', 'Recurring', 'Pattern', 'Reminder (min)', 'Tags', 'Created At'],
      ...todos.map(t => [
        t.id, t.title, t.completed ? 'true' : 'false',
        t.due_date ?? '', t.priority,
        t.is_recurring ? 'true' : 'false',
        t.recurrence_pattern ?? '', t.reminder_minutes ?? '',
        t.tags.map(tag => tag.name).join(';'),
        t.created_at,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const date = new Date().toISOString().split('T')[0];
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="todos-${date}.csv"`,
      },
    });
  }

  // JSON format
  const date = new Date().toISOString().split('T')[0];
  return new NextResponse(JSON.stringify({ version: 1, exported_at: new Date().toISOString(), todos }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="todos-${date}.json"`,
    },
  });
}
```

## API: POST /api/todos/import
```typescript
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
  }

  // Support both {todos: [...]} wrapper and bare array
  const todosData: unknown[] = Array.isArray(body) ? body : (body as { todos?: unknown[] }).todos ?? [];
  if (!Array.isArray(todosData)) {
    return NextResponse.json({ error: 'Invalid format: expected todos array' }, { status: 400 });
  }

  let importedCount = 0;
  for (const item of todosData) {
    const t = item as Record<string, unknown>;
    if (!t.title || typeof t.title !== 'string') continue; // skip invalid
    const newTodo = todoDB.create({
      user_id: session.userId,
      title: t.title,
      completed: t.completed ? 1 : 0,
      due_date: (t.due_date as string | undefined) ?? null,
      priority: (['high','medium','low'].includes(t.priority as string) ? t.priority : 'medium') as Priority,
      is_recurring: t.is_recurring ? 1 : 0,
      recurrence_pattern: (t.recurrence_pattern as RecurrencePattern | undefined) ?? null,
      reminder_minutes: (t.reminder_minutes as number | undefined) ?? null,
    });
    importedCount++;
  }

  return NextResponse.json({ message: `Successfully imported ${importedCount} todos` }, { status: 201 });
}
```

## UI Buttons
```tsx
{/* Export JSON */}
<a href="/api/todos/export?format=json" download className="bg-green-600 text-white px-3 py-1 rounded">
  Export JSON
</a>

{/* Export CSV */}
<a href="/api/todos/export?format=csv" download className="bg-green-800 text-white px-3 py-1 rounded">
  Export CSV
</a>

{/* Import */}
<label className="bg-blue-600 text-white px-3 py-1 rounded cursor-pointer">
  Import
  <input type="file" accept=".json" className="hidden" onChange={handleImport} />
</label>
```

## Import Handler
```typescript
async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const res = await fetch('/api/todos/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    alert(result.message);
    await fetchTodos(); // refresh list
  } catch (err) {
    alert(`Failed to import: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  e.target.value = ''; // reset file input
}
```

## Testing Checklist
- [ ] E2E: Click "Export JSON" → file downloads with .json extension
- [ ] E2E: Click "Export CSV" → file downloads with .csv extension
- [ ] E2E: Import valid JSON file → todos appear in list
- [ ] E2E: Import shows success message with count
- [ ] E2E: Import invalid JSON → error shown
- [ ] E2E: Exported JSON can be re-imported (round-trip)
- [ ] Unit: CSV escaping handles commas and quotes in titles
- [ ] Unit: Import skips items without a title
- [ ] Unit: Import with invalid priority defaults to 'medium'
