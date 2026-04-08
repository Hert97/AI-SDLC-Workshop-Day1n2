import { NextRequest, NextResponse } from 'next/server';
import { templateDB, todoDB, subtaskDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface SubtaskTemplate {
  title: string;
  position: number;
}

export async function POST(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.getById(Number(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title_template,
    due_date: null,
    priority: template.priority,
    is_recurring: template.is_recurring ?? 0,
    recurrence_pattern: template.recurrence_pattern ?? null,
    reminder_minutes: template.reminder_minutes ?? null,
  });

  let subtasks: SubtaskTemplate[] = [];
  try {
    subtasks = JSON.parse(template.subtasks_json ?? '[]') as SubtaskTemplate[];
  } catch {
    subtasks = [];
  }

  subtasks.forEach((s) => {
    if (s.title?.trim()) {
      subtaskDB.create(todo.id, s.title.trim(), s.position ?? 0);
    }
  });

  return NextResponse.json(todoDB.getById(todo.id), { status: 201 });
}
