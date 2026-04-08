# PRP 04: Reminders & Notifications

## Overview
Browser push notifications sent at configurable times before todo due dates. Uses a polling mechanism with duplicate prevention.

## Acceptance Criteria (from EVALUATION.md)
- [ ] Permission request works
- [ ] All 7 timing options available
- [ ] Notifications fire at correct time
- [ ] Only one notification per reminder
- [ ] Works in Singapore timezone

## Database Fields
```sql
reminder_minutes INTEGER,          -- e.g., 15, 30, 60, 120, 1440, 2880, 10080
last_notification_sent TEXT        -- ISO timestamp, prevents duplicates
```

## Reminder Options
```typescript
export const REMINDER_OPTIONS = [
  { value: 15,    label: '15 minutes before' },
  { value: 30,    label: '30 minutes before' },
  { value: 60,    label: '1 hour before' },
  { value: 120,   label: '2 hours before' },
  { value: 1440,  label: '1 day before' },
  { value: 2880,  label: '2 days before' },
  { value: 10080, label: '1 week before' },
] as const;

export const REMINDER_BADGE_LABELS: Record<number, string> = {
  15: '15m', 30: '30m', 60: '1h', 120: '2h',
  1440: '1d', 2880: '2d', 10080: '1w',
};
```

## API: GET /api/notifications/check
Returns todos that need a notification right now.

```typescript
// Logic: due_date - reminder_minutes <= now AND last_notification_sent IS NULL
const now = getSingaporeNow();
const todos = todoDB.getPendingNotifications(userId, now.toISOString());
// After fetching, mark them: UPDATE todos SET last_notification_sent = now WHERE id IN (...)
return NextResponse.json({ todos });
```

SQL query pattern:
```sql
SELECT * FROM todos
WHERE user_id = ?
  AND completed = 0
  AND reminder_minutes IS NOT NULL
  AND due_date IS NOT NULL
  AND last_notification_sent IS NULL
  AND datetime(due_date, '-' || reminder_minutes || ' minutes') <= datetime('now')
```

## useNotifications Hook (`lib/hooks/useNotifications.ts`)
```typescript
export function useNotifications(userId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (!userId || permission !== 'granted') return;
    const interval = setInterval(async () => {
      const res = await fetch('/api/notifications/check');
      const { todos } = await res.json();
      todos.forEach((todo: Todo) => {
        new Notification(`Reminder: ${todo.title}`, {
          body: `Due at ${formatSingaporeDate(todo.due_date!)}`,
          icon: '/favicon.ico',
        });
      });
    }, 30_000); // poll every 30 seconds
    return () => clearInterval(interval);
  }, [userId, permission]);

  return { permission, requestPermission };
}
```

## UI Elements

### Enable Notifications Button
```tsx
<button onClick={requestPermission} className={permission === 'granted' ? 'bg-green-500' : 'bg-orange-500'}>
  🔔 {permission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
</button>
```

### Reminder Dropdown (in Create/Edit Form)
```tsx
<select disabled={!dueDate} value={reminderMinutes ?? ''} onChange={...}>
  <option value="">None</option>
  {REMINDER_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

### Reminder Badge
```tsx
{todo.reminder_minutes && (
  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
    🔔 {REMINDER_BADGE_LABELS[todo.reminder_minutes]}
  </span>
)}
```

## Testing Checklist
- [ ] E2E: Set reminder on todo with due date
- [ ] E2E: Reminder badge displays correct abbreviation
- [ ] E2E: Reminder dropdown disabled when no due date
- [ ] E2E: All 7 reminder options present in dropdown
- [ ] E2E: GET /api/notifications/check returns todo needing notification
- [ ] E2E: After notification sent, `last_notification_sent` is set (no duplicate)
- [ ] Manual: Enable notifications → browser asks permission
- [ ] Unit: SQL query returns correct todos at reminder time
