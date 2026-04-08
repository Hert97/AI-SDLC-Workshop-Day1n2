# PRP 04: Reminders & Notifications

## Feature Overview

Implement reminder scheduling and browser notifications so users receive timely alerts before todo due dates.

This PRP aligns to Feature 04 criteria in EVALUATION.md and follows USER_GUIDE reminder behavior.

## User Stories

1. As a user, I can enable browser notifications.
2. As a user, I can set reminder timing for a todo.
3. As a user, I understand reminder status through a visible badge.
4. As a user, I only receive one notification per reminder event.
5. As a user, reminders fire using Singapore timezone rules.

## User Flow

1. User clicks Enable Notifications and grants browser permission.
2. User creates/edits a todo with due date.
3. User selects reminder offset (15m to 1w).
4. Todo displays reminder badge (for example `15m`, `1h`, `1d`).
5. System polls reminders and sends notification at the scheduled time.
6. System records last notification timestamp to prevent duplicates.

## Technical Requirements

### Data Model

1. `todos.reminder_minutes` stores offset from due date.
2. `todos.last_notification_sent` tracks last sent timestamp.
3. Reminder fields handle null safely when no reminder is configured.

### API Requirements

1. `GET /api/notifications/check` returns todos requiring notification.
2. Endpoint scopes by authenticated user.
3. Endpoint excludes todos already notified for the same reminder window.

### Client Requirements

1. Implement notification hook in `lib/hooks/useNotifications`.
2. Request browser permission via dedicated UI action.
3. Poll notification-check endpoint every 30 seconds.
4. Trigger browser notification with todo title and due context.

### Reminder Options

1. 15 minutes before
2. 30 minutes before
3. 1 hour before
4. 2 hours before
5. 1 day before
6. 2 days before
7. 1 week before

### UI Requirements

1. Enable Notifications button with clear on/off state.
2. Reminder dropdown in create/edit forms.
3. Reminder dropdown disabled if due date is missing.
4. Reminder badge shown on todo item.

## Timezone and Delivery Rules

1. Reminder time calculations must use Singapore timezone utilities.
2. Notifications must fire at the correct offset from due date.
3. Delivery must be idempotent via `last_notification_sent`.

## Validation and Error Handling

1. Reject reminder selection when due date is absent.
2. Gracefully handle denied notification permission.
3. Handle browser environments where Notification API is unavailable.
4. Keep polling resilient to transient API failures.

## Acceptance Criteria (Feature 04)

1. Permission request flow works.
2. All 7 reminder timing options are available.
3. Notifications fire at correct times.
4. Only one notification is sent per reminder event.
5. Behavior is correct in Singapore timezone.

## Testing Requirements (Feature 04)

### Manual Validation

1. Enable notifications and verify permission handling.
2. Receive notification at expected reminder time.

### E2E (Playwright)

1. Set reminder on todo with due date.
2. Verify reminder badge renders expected label.
3. Verify notifications-check API returns due reminders.

### Integration Tests

1. `/api/notifications/check` filtering logic.
2. Null and edge-case handling for reminder fields.

### Unit Tests

1. Reminder time calculation in Singapore timezone.
2. Reminder-label formatting (15m/30m/1h/2h/1d/2d/1w).
3. Duplicate suppression logic using last-sent timestamp.

## Implementation Checklist

- [ ] `reminder_minutes` and `last_notification_sent` fields in DB
- [ ] `useNotifications` hook implemented
- [ ] `GET /api/notifications/check` implemented
- [ ] enable notifications UI and permission request implemented
- [ ] reminder dropdown with 7 options implemented
- [ ] reminder dropdown disabled without due date
- [ ] browser notification trigger implemented
- [ ] polling every 30 seconds implemented
- [ ] duplicate prevention via `last_notification_sent` implemented
- [ ] reminder badge display implemented

## Out of Scope

1. Push notifications to mobile devices.
2. Email/SMS reminder channels.
3. Notification center/history UI.

---

Last Updated: April 8, 2026
PRP ID: 04