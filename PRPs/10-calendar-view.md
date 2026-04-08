# PRP 10: Calendar View

## Overview
Monthly calendar displaying todos on their due dates alongside Singapore public holidays. Navigate months and click a day to inspect its todos.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Calendar displays correctly
- [ ] Holidays shown
- [ ] Todos on correct dates
- [ ] Navigation works
- [ ] Modal shows day's todos

## Database Schema
```sql
CREATE TABLE holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,   -- 'YYYY-MM-DD'
  name TEXT NOT NULL
);
```

## API: GET /api/holidays
Returns all holidays (public, no auth required is acceptable).
```typescript
export async function GET() {
  const holidays = holidayDB.getAll();
  return NextResponse.json(holidays);
}
```

## Calendar Page Route: /calendar
URL state: `?month=YYYY-MM` (defaults to current month).

## Calendar Generation
```typescript
function buildCalendarWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const weeks: Date[][] = [];
  let week: Date[] = [];
  
  // Pad start (Sunday = 0)
  for (let i = 0; i < firstDay.getDay(); i++) {
    week.push(new Date(year, month - 1, -(firstDay.getDay() - i - 1)));
  }
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    week.push(new Date(year, month - 1, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  
  // Pad end
  while (week.length > 0 && week.length < 7) {
    week.push(new Date(year, month, week.length - (7 - week.length)));
  }
  if (week.length) weeks.push(week);
  
  return weeks;
}
```

## Calendar UI
```tsx
<div className="calendar">
  {/* Header */}
  <div className="flex items-center gap-4">
    <button onClick={prevMonth}>◀</button>
    <h2>{monthLabel} {year}</h2>
    <button onClick={nextMonth}>▶</button>
    <button onClick={goToToday}>Today</button>
  </div>
  
  {/* Day headers */}
  <div className="grid grid-cols-7">
    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
      <div key={d} className="text-center font-medium py-2">{d}</div>
    ))}
  </div>
  
  {/* Weeks */}
  {weeks.map((week, wi) => (
    <div key={wi} className="grid grid-cols-7">
      {week.map(day => {
        const dateStr = formatDateKey(day); // 'YYYY-MM-DD'
        const dayTodos = todosByDate[dateStr] ?? [];
        const holiday = holidaysByDate[dateStr];
        const isToday = dateStr === todayStr;
        const isCurrentMonth = day.getMonth() === month - 1;
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        return (
          <div
            key={dateStr}
            onClick={() => openDayModal(day, dayTodos)}
            className={[
              'min-h-[80px] p-1 border cursor-pointer hover:bg-blue-50',
              isToday ? 'bg-blue-100 font-bold' : '',
              !isCurrentMonth ? 'text-gray-300' : '',
              isWeekend ? 'bg-gray-50' : '',
            ].join(' ')}
          >
            <div>{day.getDate()}</div>
            {holiday && <div className="text-xs text-green-700">{holiday.name}</div>}
            {dayTodos.slice(0, 3).map(t => (
              <div key={t.id} className={`text-xs truncate rounded px-1 ${PRIORITY_CONFIG[t.priority].color}`}>
                {t.title}
              </div>
            ))}
            {dayTodos.length > 3 && <div className="text-xs text-gray-500">+{dayTodos.length - 3} more</div>}
          </div>
        );
      })}
    </div>
  ))}
</div>
```

## Day Modal (click on date)
```tsx
<div className="modal">
  <h3>{formattedDate}</h3>
  {holiday && <p className="text-green-700">🏖️ {holiday.name}</p>}
  {dayTodos.length === 0 && <p>No todos due on this day.</p>}
  {dayTodos.map(todo => (
    <div key={todo.id} className="flex items-center gap-2">
      <span className={PRIORITY_CONFIG[todo.priority].color}>{todo.priority}</span>
      <span>{todo.title}</span>
      {todo.completed && <span>✓</span>}
    </div>
  ))}
  <button onClick={closeModal}>Close</button>
</div>
```

## URL State Management
```typescript
const searchParams = useSearchParams();
const monthParam = searchParams.get('month'); // 'YYYY-MM'
const [year, month] = monthParam
  ? monthParam.split('-').map(Number)
  : [getSingaporeNow().getFullYear(), getSingaporeNow().getMonth() + 1];

function navigate(y: number, m: number) {
  router.push(`/calendar?month=${y}-${String(m).padStart(2, '0')}`);
}
```

## Testing Checklist
- [ ] E2E: Navigate to /calendar → current month shown
- [ ] E2E: Click "▶" → next month shown in URL
- [ ] E2E: Click "◀" → previous month shown
- [ ] E2E: Click "Today" → returns to current month
- [ ] E2E: Create todo with due date → appears on correct calendar day
- [ ] E2E: Holiday appears on correct date with name
- [ ] E2E: Click on day with todos → modal opens with todo list
- [ ] Unit: buildCalendarWeeks(2026, 1) starts on correct day (Thursday Jan 1)
