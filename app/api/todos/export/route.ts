import { NextRequest, NextResponse } from 'next/server';
import { todoDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'json';

  const todos = todoDB.getAll(session.userId);

  if (format === 'csv') {
    const header = 'id,title,completed,priority,due_date,is_recurring,recurrence_pattern,reminder_minutes,tags,subtasks_total,subtasks_completed,created_at';
    const rows = todos.map((t) => {
      const tags = t.tags.map((tg) => tg.name).join(';');
      const total = t.subtasks.length;
      const done = t.subtasks.filter((s) => s.completed).length;
      const fields = [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        t.completed ? 1 : 0,
        t.priority,
        t.due_date ?? '',
        t.is_recurring ? 1 : 0,
        t.recurrence_pattern ?? '',
        t.reminder_minutes ?? '',
        `"${tags}"`,
        total,
        done,
        t.created_at,
      ];
      return fields.join(',');
    });
    const csv = [header, ...rows].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="todos.csv"',
      },
    });
  }

  const data = {
    exported_at: new Date().toISOString(),
    todos: todos.map((t) => ({
      title: t.title,
      completed: t.completed,
      priority: t.priority,
      due_date: t.due_date,
      is_recurring: t.is_recurring,
      recurrence_pattern: t.recurrence_pattern,
      reminder_minutes: t.reminder_minutes,
      created_at: t.created_at,
      subtasks: t.subtasks.map((s) => ({ title: s.title, completed: s.completed, position: s.position })),
      tags: t.tags.map((tg) => tg.name),
    })),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="todos.json"',
    },
  });
}
