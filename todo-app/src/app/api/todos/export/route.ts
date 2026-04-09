import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const todos = todoDB.findAllByUserId(session.userId);
  
  const format = request.nextUrl.searchParams.get('format') || 'json';

  if (format === 'csv') {
    const headers = 'ID,Title,Completed,Due Date,Priority,Recurring,Pattern,Reminder,Tags,Subtasks\n';
    const csv = todos.map(t => {
      const tags = t.tags?.map(tag => tag.name).join(', ') || '';
      const subtasks = t.subtasks?.map(st => st.title).join(', ') || '';
      return `${t.id},"${t.title}",${t.completed},${t.due_date || ''},${t.priority},${t.is_recurring},${t.recurrence_pattern || ''},${t.reminder_minutes || ''},"${tags}","${subtasks}"`;
    }).join('\n');
    return new NextResponse(headers + csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="todos-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(todos, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="todos-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}
