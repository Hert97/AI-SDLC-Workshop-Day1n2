import { NextRequest, NextResponse } from 'next/server';
import { templateDB } from '@/lib/db';
import { getSession } from '@/lib/auth';
import type { Priority, RecurrencePattern } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const templates = templateDB.getAll(session.userId);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json() as {
    name?: string;
    title_template?: string;
    priority?: Priority;
    is_recurring?: boolean;
    recurrence_pattern?: RecurrencePattern | null;
    reminder_minutes?: number | null;
    subtasks?: { title: string; position: number }[];
  };

  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!body.title_template?.trim()) return NextResponse.json({ error: 'Title template is required' }, { status: 400 });

  const subtasksJson = JSON.stringify(body.subtasks ?? []);

  const template = templateDB.create({
    user_id: session.userId,
    name: body.name.trim(),
    description: null,
    category: null,
    title_template: body.title_template.trim(),
    priority: body.priority ?? 'medium',
    is_recurring: body.is_recurring ? 1 : 0,
    recurrence_pattern: body.recurrence_pattern ?? null,
    reminder_minutes: body.reminder_minutes ?? null,
    subtasks_json: subtasksJson,
  });

  return NextResponse.json(template, { status: 201 });
}
