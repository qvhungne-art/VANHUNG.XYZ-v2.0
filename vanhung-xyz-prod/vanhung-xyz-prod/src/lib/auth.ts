import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDbPool } from './db';
import type { UserProfile } from './types';

const COOKIE_NAME = 'vh_session';

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    crypto.createHash('sha256').update(process.env.DATABASE_URL || 'vanhung-fallback-secret').digest('hex')
  );
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signSessionToken(userId: number): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 14; // 14 days
  const payload = `${userId}.${exp}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [uidStr, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!exp || Date.now() > exp) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(`${uidStr}.${expStr}`).digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch {
    return null;
  }
  const uid = Number(uidStr);
  return Number.isInteger(uid) && uid > 0 ? uid : null;
}

export function setSessionCookie(userId: number): void {
  const token = signSessionToken(userId);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearSessionCookie(): void {
  cookies().set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<UserProfile | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;

  const pool = getDbPool();
  const res = await pool.query(
    'SELECT id, username, email, role, balance, total_deposited FROM users WHERE id = $1',
    [userId]
  );
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return {
    id: Number(r.id),
    username: r.username,
    email: r.email,
    role: r.role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    balance: Number(r.balance),
    total_deposited: Number(r.total_deposited),
  };
}
