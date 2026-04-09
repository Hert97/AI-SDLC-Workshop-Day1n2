import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { User } from './db';

const SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const COOKIE_NAME = 'session';

export interface Session {
  userId: number;
  username: string;
}

export async function createSession(user: User) {
  const payload: Session = { userId: user.id, username: user.username };
  const token = jwt.sign(payload, SECRET, { expiresIn: '7d' });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getSession(): Promise<Session | null> {
  const cookie = (await cookies()).get(COOKIE_NAME);
  if (!cookie) return null;

  try {
    const session = jwt.verify(cookie.value, SECRET) as Session;
    return session;
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
