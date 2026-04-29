import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSessionCookie } from '@/lib/local-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const session = authenticateUser(email, password);
    if (!session) {
      return NextResponse.json(
        { error: 'E-mail ou senha inválidos' },
        { status: 401 }
      );
    }

    const cookie = createSessionCookie(session);
    const response = NextResponse.json({
      user: { id: session.id, email: session.email, name: session.name, role: session.role },
    });
    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
