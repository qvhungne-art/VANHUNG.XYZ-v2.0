import { NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT p.id, p.category, p.name, p.price, p.country, p.badge, p.warranty, p.format_hint,
              COUNT(si.id) FILTER (WHERE si.status = 'AVAILABLE')::int AS stock
         FROM products p
         LEFT JOIN stock_items si ON si.product_id = p.id
        WHERE p.is_active = TRUE
        GROUP BY p.id
        ORDER BY p.id DESC`
    );
    return NextResponse.json({
      products: res.rows.map((r) => ({
        id: Number(r.id),
        category: r.category,
        name: r.name,
        price: Number(r.price),
        stock: Number(r.stock),
        country: r.country || 'VN',
        badge: r.badge || '',
        warranty: r.warranty || '24h Login',
        format_hint: r.format_hint || 'user|pass|2fa',
      })),
    });
  } catch (err) {
    console.error('Products GET error:', err);
    return NextResponse.json({ products: [], error: 'Không thể tải danh sách sản phẩm từ Database.' }, { status: 500 });
  }
}
