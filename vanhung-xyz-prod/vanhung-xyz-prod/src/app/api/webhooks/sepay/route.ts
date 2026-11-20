import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (process.env.SEPAY_API_KEY && req.headers.get('authorization') !== `Apikey ${process.env.SEPAY_API_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized Webhook' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const match = String(body?.content || '').toUpperCase().match(/VH\s*(\d+)/);
  const amount = parseInt(String(body?.transferAmount || 0), 10);
  if (!match || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Không nhận diện được mã nạp VH <USER_ID>.' }, { status: 400 });
  }

  const userId = parseInt(match[1], 10);
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const uRes = await client.query('SELECT id, balance, total_deposited FROM users WHERE id = $1 FOR UPDATE', [userId]);
    if (!uRes.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'User ID không tồn tại.' }, { status: 404 });
    }
    const u = uRes.rows[0];
    const newBal = Number(u.balance) + amount;
    const newDep = Number(u.total_deposited) + amount;
    await client.query('UPDATE users SET balance = $1, total_deposited = $2 WHERE id = $3', [newBal, newDep, userId]);
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference_code, description)
       VALUES ($1, 'DEPOSIT', $2, $3, $4, $5, $6)`,
      [userId, amount, u.balance, newBal, body?.referenceCode || `SEPAY-${Date.now()}`, `Nạp tự động VietQR · VH ${userId}`]
    );
    await client.query('COMMIT');
    return NextResponse.json({ status: 'credited', userId, amount, balanceAfter: newBal });
  } catch {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Lỗi xử lý webhook SePay.' }, { status: 500 });
  } finally {
    client.release();
  }
}
