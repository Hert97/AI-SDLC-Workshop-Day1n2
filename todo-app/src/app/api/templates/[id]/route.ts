import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { templateDB } from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  const template = templateDB.findById(id);

  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  templateDB.delete(id);
  return new NextResponse(null, { status: 204 });
}
