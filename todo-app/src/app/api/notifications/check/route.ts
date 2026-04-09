import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const now = getSingaporeNow();
  const todos = todoDB.findTodosForNotification(session.userId, now.toISOString());

  const notifications = todos.filter(todo => {
    if (!todo.due_date || !todo.reminder_minutes) return false;
    
    const dueDate = new Date(todo.due_date);
    const reminderTime = new Date(dueDate.getTime() - todo.reminder_minutes * 60000);

    return now >= reminderTime && (!todo.last_notification_sent || new Date(todo.last_notification_sent) < reminderTime);
  });

  for (const todo of notifications) {
    todoDB.update(todo.id, { last_notification_sent: now.toISOString() });
  }

  return NextResponse.json(notifications);
}
