'use client';

import { useState, useEffect } from 'react';
import type { Todo } from '@/lib/db';
import { formatSingaporeDate } from '@/lib/timezone';

export function useNotifications(userId: number | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  useEffect(() => {
    if (!userId || permission !== 'granted') return;

    const check = async () => {
      try {
        const res = await fetch('/api/notifications/check');
        if (!res.ok) return;
        const { todos } = (await res.json()) as { todos: Todo[] };
        todos.forEach((todo) => {
          new Notification(`Reminder: ${todo.title}`, {
            body: todo.due_date
              ? `Due at ${formatSingaporeDate(todo.due_date)}`
              : 'Check your todo app',
            icon: '/favicon.ico',
          });
        });
      } catch {
        // Network error – silently ignore
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [userId, permission]);

  return { permission, requestPermission };
}
