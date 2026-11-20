import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const targetUserId = Number(body?.userId);
  const delta = parseInt(String(body?.delta || 0), 10);
  if (!targetUserId || !delta) return NextResponse.json({ error: 'Tham số không hợp lệ.' }, { status: 400 });

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const uRes = await client.query('SELECT id, balance, total_deposited FROM users WHERE id = $1 FOR UPDATE', [targetUserId]);
    if (!uRes.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Không tìm thấy user.' }, { status: 404 });
    }
    const u = uRes.rows[0];
    const newBal = Math.max(0, Number(u.balance) + delta);
    const newDep = delta > 0 ? Number(u.total_deposited) + delta : Number(u.total_deposited);
    await client.query('UPDATE users SET balance = $1, total_deposited = $2 WHERE id = $3', [newBal, newDep, targetUserId]);
    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference_code, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [targetUserId, delta >= 0 ? 'DEPOSIT' : 'PURCHASE', delta, u.balance, newBal, `ADM-${Date.now().toString().slice(-5)}`, `Admin điều chỉnh số dư`]
    );
    await client.query('COMMIT');
    return NextResponse.json({ balanceAfter: newBal });
  } catch {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Lỗi điều chỉnh ví.' }, { status: 500 });
  } finally {
    client.release();
  }
}
