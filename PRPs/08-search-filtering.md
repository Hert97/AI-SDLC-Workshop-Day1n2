# PRP 08: Search & Advanced Filtering

## Overview
Real-time client-side search across todo titles and subtask titles. Multi-criteria filtering (priority, tag, date range, completion status) with saveable presets in localStorage.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Search is case-insensitive
- [ ] Includes tag names in search
- [ ] Filters combine with AND
- [ ] Real-time updates
- [ ] Clear message for empty results

## Filter State
```typescript
interface FilterState {
  search: string;
  priority: string;          // '' | 'high' | 'medium' | 'low'
  tagId: string;             // '' | tag id as string
  completionStatus: string;  // '' | 'incomplete' | 'completed'
  dateFrom: string;
  dateTo: string;
}

interface SavedPreset extends FilterState {
  name: string;
}
```

## Client-Side Filter Logic
```typescript
function applyFilters(todos: Todo[], filters: FilterState): Todo[] {
  const search = filters.search.toLowerCase().trim();
  return todos.filter(todo => {
    // 1. Search: title OR subtask titles
    if (search) {
      const inTitle = todo.title.toLowerCase().includes(search);
      const inSubtasks = todo.subtasks?.some(s => s.title.toLowerCase().includes(search));
      if (!inTitle && !inSubtasks) return false;
    }
    // 2. Priority
    if (filters.priority && todo.priority !== filters.priority) return false;
    // 3. Tag
    if (filters.tagId && !todo.tags?.some(t => String(t.id) === filters.tagId)) return false;
    // 4. Completion status
    if (filters.completionStatus === 'incomplete' && todo.completed) return false;
    if (filters.completionStatus === 'completed' && !todo.completed) return false;
    // 5. Date range
    if (filters.dateFrom && todo.due_date && todo.due_date < filters.dateFrom) return false;
    if (filters.dateTo && todo.due_date && todo.due_date > filters.dateTo + 'T23:59:59') return false;
    return true;
  });
}
```

## Search Bar
```tsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
  <input
    className="w-full pl-10 pr-8"
    placeholder="Search todos and subtasks..."
    value={filters.search}
    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
  />
  {filters.search && (
    <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setFilters(f => ({ ...f, search: '' }))}>✕</button>
  )}
</div>
```

## Quick Filters Row
```tsx
<div className="flex gap-2">
  {/* Priority filter */}
  <select value={filters.priority} onChange={...}>
    <option value="">All Priorities</option>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
  </select>
  
  {/* Tag filter (only if tags exist) */}
  {tags.length > 0 && (
    <select value={filters.tagId} onChange={...}>
      <option value="">All Tags</option>
      {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  )}
  
  {/* Advanced toggle */}
  <button onClick={() => setShowAdvanced(!showAdvanced)} className={showAdvanced ? 'bg-blue-500' : 'bg-gray-300'}>
    {showAdvanced ? '▼' : '▶'} Advanced
  </button>
  
  {/* Active filter actions */}
  {isAnyFilterActive && (
    <>
      <button onClick={clearAllFilters} className="bg-red-500 text-white">Clear All</button>
      <button onClick={() => setShowSavePreset(true)} className="bg-green-500 text-white">💾 Save Filter</button>
    </>
  )}
</div>
```

## Advanced Panel
```tsx
{showAdvanced && (
  <div>
    <select value={filters.completionStatus} onChange={...}>
      <option value="">All Todos</option>
      <option value="incomplete">Incomplete Only</option>
      <option value="completed">Completed Only</option>
    </select>
    <input type="date" value={filters.dateFrom} onChange={...} placeholder="Due from" />
    <input type="date" value={filters.dateTo} onChange={...} placeholder="Due to" />
    
    {/* Saved presets */}
    {presets.length > 0 && (
      <div>
        <strong>Saved Filter Presets</strong>
        {presets.map((preset, i) => (
          <span key={i}>
            <button onClick={() => applyPreset(preset)}>{preset.name}</button>
            <button onClick={() => deletePreset(i)}>✕</button>
          </span>
        ))}
      </div>
    )}
  </div>
)}
```

## Preset Storage (localStorage)
```typescript
const PRESETS_KEY = 'todo-filter-presets';

function loadPresets(): SavedPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
  } catch {
    return [];
  }
}

function savePreset(preset: SavedPreset): void {
  const presets = loadPresets();
  localStorage.setItem(PRESETS_KEY, JSON.stringify([...presets, preset]));
}
```

## Empty State
```tsx
{filteredTodos.length === 0 && isAnyFilterActive && (
  <div className="text-center py-8 text-gray-500">
    No todos match your filters. <button onClick={clearAllFilters}>Clear filters</button>
  </div>
)}
```

## Testing Checklist
- [ ] E2E: Type in search → todos filter in real-time
- [ ] E2E: Search finds todo by subtask title
- [ ] E2E: Search is case-insensitive
- [ ] E2E: Filter by High priority
- [ ] E2E: Filter by tag
- [ ] E2E: Combine search + priority filter
- [ ] E2E: Clear All button resets all filters
- [ ] E2E: Save Filter preset → appears in advanced panel
- [ ] E2E: Apply saved preset → filters restored
- [ ] E2E: No results state shows when nothing matches
- [ ] Performance: Filtering 100 todos updates in less than 100ms
