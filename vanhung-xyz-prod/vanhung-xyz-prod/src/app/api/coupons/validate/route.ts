import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || '').trim().toUpperCase();
    const orderAmount = Number(body?.orderAmount || 0);
    if (!code) return NextResponse.json({ valid: false, error: 'Chưa nhập mã.' }, { status: 400 });

    const pool = getDbPool();
    const res = await pool.query(
      `SELECT code, discount_type, discount_value, min_order
         FROM coupons
        WHERE code = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
      [code]
    );
    if (!res.rows.length) {
      return NextResponse.json({ valid: false, error: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' }, { status: 404 });
    }
    const c = res.rows[0];
    if (orderAmount < Number(c.min_order)) {
      return NextResponse.json(
        { valid: false, error: `Mã ${c.code} yêu cầu đơn tối thiểu ${Number(c.min_order).toLocaleString('vi-VN')}đ.` },
        { status: 400 }
      );
    }
    return NextResponse.json({
      valid: true,
      coupon: {
        code: c.code,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value),
        min_order: Number(c.min_order),
      },
    });
  } catch {
    return NextResponse.json({ valid: false, error: 'Lỗi kiểm tra mã giảm giá.' }, { status: 500 });
  }
}
