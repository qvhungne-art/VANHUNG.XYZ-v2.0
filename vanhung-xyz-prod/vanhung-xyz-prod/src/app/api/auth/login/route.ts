import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = String(body?.identifier || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập email/tên đăng nhập và mật khẩu.' }, { status: 400 });
    }

    const pool = getDbPool();
    const res = await pool.query(
      'SELECT id, username, email, password_hash, role, balance, total_deposited FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1',
      [identifier]
    );
    if (!res.rows.length) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    const row = res.rows[0];
    if (!verifyPassword(password, row.password_hash)) {
      return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không chính xác.' }, { status: 401 });
    }

    setSessionCookie(Number(row.id));
    return NextResponse.json({
      user: {
        id: Number(row.id),
        username: row.username,
        email: row.email,
        role: row.role,
        balance: Number(row.balance),
        total_deposited: Number(row.total_deposited),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Lỗi đăng nhập hệ thống.' }, { status: 500 });
  }
}
