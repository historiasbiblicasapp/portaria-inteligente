import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/local-auth';

export async function GET() {
  const session = getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({
    user: { id: session.id, email: session.email, name: session.name, role: session.role },
  });
}
