import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, templateDB, todoDB } from '@/lib/db';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.findById(Number(id), session.userId);
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    priority: template.priority,
    is_recurring: template.is_recurring,
    recurrence_pattern: template.recurrence_pattern,
    reminder_minutes: template.reminder_minutes,
  });

  const subtasks: Array<{ title: string }> = JSON.parse(template.subtasks_json || '[]');
  subtasks.forEach((s) => {
    if (s?.title) {
      subtaskDB.create(todo.id, s.title);
    }
  });

  return NextResponse.json({ data: todo }, { status: 201 });
}
