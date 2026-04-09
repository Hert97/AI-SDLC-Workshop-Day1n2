import { NextRequest, NextResponse } from 'next/server';
import { holidayDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const holidays = holidayDB.findAll();
  return NextResponse.json(holidays);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, date, description, recurring } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!date || typeof date !== 'string') {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  holidayDB.create(name.trim(), date, description?.trim() || undefined, Boolean(recurring));
  return NextResponse.json({ success: true }, { status: 201 });
}
