import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB, Todo } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const importedTodos: Todo[] = await request.json();
  let count = 0;

  const userTags = tagDB.findAllByUserId(session.userId);
  const tagMap = new Map(userTags.map(t => [t.name, t.id]));

  for (const todo of importedTodos) {
    const tagIds: number[] = [];
    if (todo.tags) {
      for (const importedTag of todo.tags) {
        if (tagMap.has(importedTag.name)) {
          tagIds.push(tagMap.get(importedTag.name)!);
        } else {
          const newTag = tagDB.create(session.userId, importedTag.name, importedTag.color);
          tagMap.set(newTag.name, newTag.id);
          tagIds.push(newTag.id);
        }
      }
    }

    const newTodo = todoDB.create({
      user_id: session.userId,
      title: todo.title,
      due_date: todo.due_date,
      priority: todo.priority,
      is_recurring: todo.is_recurring,
      recurrence_pattern: todo.recurrence_pattern,
      reminder_minutes: todo.reminder_minutes,
      created_at: todo.created_at || getSingaporeNow().toISOString(),
      completed_at: todo.completed_at,
    }, tagIds);

    if (todo.subtasks) {
      for (const subtask of todo.subtasks) {
        todoDB.createSubtask(newTodo.id, subtask.title);
      }
    }
    count++;
  }

  return NextResponse.json({ message: `Successfully imported ${count} todos.` });
}
