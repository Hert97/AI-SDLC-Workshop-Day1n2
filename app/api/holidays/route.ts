import { NextResponse } from 'next/server';
import { holidayDB } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const holidays = holidayDB.getAll();
  return NextResponse.json(holidays);
}
