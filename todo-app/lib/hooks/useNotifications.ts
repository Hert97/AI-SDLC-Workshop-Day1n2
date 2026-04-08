'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Todo } from '@/lib/db';

export function useNotifications(enabled: boolean) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const timer = window.setInterval(async () => {
      const response = await fetch('/api/notifications/check');
      if (!response.ok) return;
      const payload = (await response.json()) as { data: Todo[] };
      payload.data.forEach((todo) => {
        new Notification('Todo Reminder', {
          body: `${todo.title} is due soon`,
        });
      });
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [enabled]);

  const canNotify = useMemo(() => permission === 'granted', [permission]);

  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }

  return {
    canNotify,
    permission,
    requestPermission,
  };
}
