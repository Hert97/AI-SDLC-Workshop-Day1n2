import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTodosRequiringReminder } from '@/lib/db';
import { formatSingaporeDate, getSingaporeNow } from '@/lib/timezone';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const now = getSingaporeNow();
  const todos = getTodosRequiringReminder(session.userId, now.toISOString());
  return NextResponse.json({
    checked_at: formatSingaporeDate(now),
    data: todos,
  });
}
