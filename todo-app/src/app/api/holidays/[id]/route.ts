import { NextRequest, NextResponse } from 'next/server';
import { holidayDB } from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const holidayId = parseInt(id, 10);
  if (isNaN(holidayId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json();
  const { name, date, description, recurring } = body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!date || typeof date !== 'string') {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  holidayDB.update(holidayId, name.trim(), date, description?.trim() || undefined, Boolean(recurring));
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const holidayId = parseInt(id, 10);
  if (isNaN(holidayId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  holidayDB.deleteById(holidayId);
  return NextResponse.json({ success: true });
}
