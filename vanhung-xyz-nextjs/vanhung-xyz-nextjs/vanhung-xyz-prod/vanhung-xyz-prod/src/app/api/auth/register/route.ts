import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { hashPassword, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body?.username || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');

    if (username.length < 2 || !email.includes('@') || password.length < 6) {
      return NextResponse.json({ error: 'Vui lòng nhập đầy đủ tên, email hợp lệ và mật khẩu từ 6 ký tự.' }, { status: 400 });
    }

    const pool = getDbPool();
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length) {
      return NextResponse.json({ error: 'Email này đã được đăng ký.' }, { status: 409 });
    }

    // Tài khoản đầu tiên đăng ký trên hệ thống sẽ tự động nhận quyền ADMIN
    const countRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
    const isFirstUser = Number(countRes.rows[0].cnt) === 0;
    const role = isFirstUser ? 'ADMIN' : 'CUSTOMER';

    const passwordHash = hashPassword(password);
    const ins = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, balance, total_deposited)
       VALUES ($1, $2, $3, $4, 0, 0)
       RETURNING id, username, email, role, balance, total_deposited`,
      [username, email, passwordHash, role]
    );

    const user = ins.rows[0];
    setSessionCookie(Number(user.id));

    return NextResponse.json({
      user: {
        id: Number(user.id),
        username: user.username,
        email: user.email,
        role: user.role,
        balance: Number(user.balance),
        total_deposited: Number(user.total_deposited),
      },
      isFirstAdmin: isFirstUser,
    });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Lỗi đăng ký tài khoản. Kiểm tra kết nối DATABASE_URL.' }, { status: 500 });
  }
}
