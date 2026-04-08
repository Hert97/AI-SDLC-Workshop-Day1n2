import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const month = request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  return NextResponse.json({ data: holidayDB.listByMonth(month) });
}
