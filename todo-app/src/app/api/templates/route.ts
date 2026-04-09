import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { templateDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const templates = templateDB.findAllByUserId(session.userId);
  return NextResponse.json(templates);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const newTemplate = templateDB.create(session.userId, body);
  
  return NextResponse.json(newTemplate, { status: 201 });
}
