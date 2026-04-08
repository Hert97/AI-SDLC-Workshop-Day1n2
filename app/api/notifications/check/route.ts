import { NextResponse } from 'next/server';
import { todoDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const now = getSingaporeNow().toISOString();
  const pending = todoDB.getPendingNotifications(session.userId, now);

  const sentAt = getSingaporeNow().toISOString();
  pending.forEach((todo) => {
    todoDB.markNotificationSent(todo.id, sentAt);
  });

  return NextResponse.json(pending);
}
