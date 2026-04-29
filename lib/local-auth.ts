import { cookies } from 'next/headers';
import { createHash } from 'crypto';

export type UserRole = 'master' | 'operador';

export interface LocalUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

const SECRET = process.env.AUTH_SECRET || 'portaria-inteligente-secret-2024';
const COOKIE_NAME = 'pi-session';
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

const USERS: LocalUser[] = [
  {
    id: 'master-001',
    email: 'admin@portaria.com',
    password: hashPassword('admin123'),
    name: 'Administrador',
    role: 'master',
  },
  {
    id: 'operador-001',
    email: 'operador@portaria.com',
    password: hashPassword('operador123'),
    name: 'Operador',
    role: 'operador',
  },
];

function hashPassword(password: string): string {
  return createHash('sha256').update(password + SECRET).digest('hex');
}

function signPayload(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const sig = createHash('sha256').update(data + SECRET).digest('hex');
  return Buffer.from(data + '.' + sig).toString('base64');
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [dataStr, sig] = decoded.split('.');
    const expectedSig = createHash('sha256').update(dataStr + SECRET).digest('hex');
    if (sig !== expectedSig) return null;
    const payload: SessionPayload = JSON.parse(dataStr);
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function authenticateUser(email: string, password: string): SessionPayload | null {
  const user = USERS.find(
    (u) => u.email === email && u.password === hashPassword(password)
  );
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Date.now() + SESSION_DURATION * 1000,
  };
}

export function getSessionFromCookies(): SessionPayload | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function createSessionCookie(payload: SessionPayload) {
  return {
    name: COOKIE_NAME,
    value: signPayload(payload),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: SESSION_DURATION,
    },
  };
}
