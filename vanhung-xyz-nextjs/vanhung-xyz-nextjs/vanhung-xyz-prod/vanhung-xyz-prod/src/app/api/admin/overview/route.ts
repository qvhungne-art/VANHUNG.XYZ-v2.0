import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ tài khoản Admin mới có quyền truy cập.' }, { status: 403 });
  }

  const pool = getDbPool();
  const [revRes, usersRes, warrantiesRes] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(total_amount), 0)::bigint AS revenue, COUNT(*)::int AS total_orders FROM orders'),
    pool.query('SELECT id, username, email, role, balance, total_deposited FROM users ORDER BY id ASC LIMIT 100'),
    pool.query(
      `SELECT wt.id, o.order_code, u.username, wt.reason, wt.status, wt.created_at
         FROM warranty_tickets wt
         JOIN orders o ON o.id = wt.order_id
         JOIN users u ON u.id = wt.user_id
        ORDER BY wt.id DESC LIMIT 50`
    ),
  ]);

  return NextResponse.json({
    revenue: Number(revRes.rows[0].revenue),
    totalOrders: Number(revRes.rows[0].total_orders),
    users: usersRes.rows.map((u) => ({
      id: Number(u.id),
      username: u.username,
      email: u.email,
      role: u.role,
      balance: Number(u.balance),
      total_deposited: Number(u.total_deposited),
    })),
    warranties: warrantiesRes.rows,
  });
}
