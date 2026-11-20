import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Chưa đăng nhập.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = Number(body?.orderId);
  const reason = String(body?.reason || '').trim();
  if (!orderId || reason.length < 4) {
    return NextResponse.json({ error: 'Vui lòng mô tả lỗi rõ ràng.' }, { status: 400 });
  }

  const pool = getDbPool();
  const check = await pool.query('SELECT id FROM orders WHERE id = $1 AND user_id = $2', [orderId, user.id]);
  if (!check.rows.length) {
    return NextResponse.json({ error: 'Không tìm thấy đơn hàng của bạn.' }, { status: 404 });
  }

  const ins = await pool.query(
    `INSERT INTO warranty_tickets (order_id, user_id, reason, status)
     VALUES ($1, $2, $3, 'Đang kiểm tra')
     RETURNING id, status`,
    [orderId, user.id, reason]
  );
  return NextResponse.json({ ticket: ins.rows[0] });
}
