import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { templateDB, todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  const template = templateDB.findById(id);

  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const { due_date, tags } = await request.json();

  const newTodo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    priority: template.priority ?? 'medium',
    is_recurring: template.is_recurring ?? 0,
    recurrence_pattern: template.recurrence_pattern,
    reminder_minutes: template.reminder_minutes,
    created_at: getSingaporeNow().toISOString(),
    due_date,
  }, tags);

  if (template.subtasks_json) {
    const subtasks = JSON.parse(template.subtasks_json);
    for (const subtask of subtasks) {
      todoDB.createSubtask(newTodo.id, subtask.title);
    }
  }

  const finalTodo = todoDB.findById(newTodo.id);
  return NextResponse.json(finalTodo, { status: 201 });
}
