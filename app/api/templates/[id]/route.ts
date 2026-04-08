import { NextRequest, NextResponse } from 'next/server';
import { templateDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { Priority, RecurrencePattern } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.getById(Number(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json() as {
    name?: string;
    title_template?: string;
    priority?: Priority;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    subtasks?: { title: string; position: number }[];
  };

  const subtasksJson = body.subtasks !== undefined ? JSON.stringify(body.subtasks) : undefined;

  templateDB.update(Number(id), {
    name: body.name,
    title_template: body.title_template,
    priority: body.priority,
    is_recurring: body.is_recurring !== undefined ? (body.is_recurring ? 1 : 0) : undefined,
    recurrence_pattern: body.recurrence_pattern,
    reminder_minutes: body.reminder_minutes,
    subtasks_json: subtasksJson,
  });

  return NextResponse.json(templateDB.getById(Number(id)));
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const template = templateDB.getById(Number(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  templateDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
