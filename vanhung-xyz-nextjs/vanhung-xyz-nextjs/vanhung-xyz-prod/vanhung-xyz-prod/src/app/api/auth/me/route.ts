import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ user: null, orders: [], ledger: [] });
    }

    const pool = getDbPool();
    const ordersRes = await pool.query(
      `SELECT o.id, o.order_code, p.name AS product_name, o.quantity, o.total_amount, o.created_at,
              COALESCE(array_agg(si.payload ORDER BY si.id) FILTER (WHERE si.payload IS NOT NULL), '{}') AS items,
              (SELECT wt.status FROM warranty_tickets wt WHERE wt.order_id = o.id ORDER BY wt.id DESC LIMIT 1) AS warranty_status,
              (SELECT wt.reason FROM warranty_tickets wt WHERE wt.order_id = o.id ORDER BY wt.id DESC LIMIT 1) AS warranty_reason
         FROM orders o
         JOIN products p ON p.id = o.product_id
         LEFT JOIN stock_items si ON si.order_id = o.id
        WHERE o.user_id = $1
        GROUP BY o.id, p.name
        ORDER BY o.id DESC
        LIMIT 50`,
      [user.id]
    );

    const ledgerRes = await pool.query(
      `SELECT id, type, amount, balance_after, reference_code, description, created_at
         FROM wallet_transactions
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT 50`,
      [user.id]
    );

    return NextResponse.json({
      user,
      orders: ordersRes.rows.map((r) => ({
        id: Number(r.id),
        order_code: r.order_code,
        product_name: r.product_name,
        quantity: Number(r.quantity),
        total_amount: Number(r.total_amount),
        created_at: r.created_at,
        items: r.items || [],
        warranty_status: r.warranty_status || null,
        warranty_reason: r.warranty_reason || null,
      })),
      ledger: ledgerRes.rows.map((l) => ({
        id: Number(l.id),
        type: l.type,
        amount: Number(l.amount),
        balance_after: Number(l.balance_after),
        reference_code: l.reference_code,
        description: l.description,
        created_at: l.created_at,
      })),
    });
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ user: null, orders: [], ledger: [] });
  }
}
