import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { exportDataForUser } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const data = exportDataForUser(session.userId);
  return NextResponse.json({
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    ...data,
  });
}
