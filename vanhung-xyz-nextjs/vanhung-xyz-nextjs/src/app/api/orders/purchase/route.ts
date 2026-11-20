import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';

/**
 * POST /api/orders/purchase
 * PostgreSQL Database Transaction + Row-Level Locking:
 * - SELECT ... FOR UPDATE trên bảng users (chống trừ âm số dư)
 * - SELECT ... FOR UPDATE SKIP LOCKED trên bảng stock_items (chống race condition)
 */
export async function POST(req: NextRequest) {
  const pool = getDbPool();
  if (!pool) {
    return NextResponse.json(
      { error: 'Chưa cấu hình DATABASE_URL trong Vercel Environment Variables.' },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const userId = Number(body?.userId);
  const productId = Number(body?.productId);
  const qty = parseInt(String(body?.quantity || 0), 10);
  const couponCode = body?.couponCode ? String(body.couponCode).trim().toUpperCase() : null;

  if (!userId || !productId || !Number.isInteger(qty) || qty < 1) {
    return NextResponse.json({ error: 'Tham số userId, productId hoặc quantity không hợp lệ.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query(
      'SELECT id, balance, total_deposited FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (!userRes.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }
    const user = userRes.rows[0];

    const prodRes = await client.query(
      'SELECT id, name, price FROM products WHERE id = $1 AND is_active = TRUE',
      [productId]
    );
    if (!prodRes.rows.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Sản phẩm không tồn tại.' }, { status: 404 });
    }
    const product = prodRes.rows[0];

    const stockRes = await client.query(
      `SELECT id, payload FROM stock_items
        WHERE product_id = $1 AND status = 'AVAILABLE'
        ORDER BY id ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED`,
      [productId, qty]
    );
    if (stockRes.rows.length < qty) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: `Tồn kho chỉ còn ${stockRes.rows.length} sản phẩm khả dụng.` },
        { status: 409 }
      );
    }

    const rawTotal = Number(product.price) * qty;
    let discount = 0;
    if (couponCode) {
      const cRes = await client.query(
        `SELECT code, discount_type, discount_value, min_order
           FROM coupons
          WHERE code = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
        [couponCode]
      );
      if (cRes.rows.length && rawTotal >= Number(cRes.rows[0].min_order)) {
        const c = cRes.rows[0];
        discount =
          c.discount_type === 'PERCENT'
            ? Math.round(rawTotal * (Number(c.discount_value) / 100))
            : Number(c.discount_value);
      }
    }
    const finalTotal = Math.max(0, rawTotal - discount);

    if (Number(user.balance) < finalTotal) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Số dư ví không đủ.' }, { status: 402 });
    }

    const newBalance = Number(user.balance) - finalTotal;
    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, user.id]);

    const orderCode = 'VH-' + Date.now().toString().slice(-6);
    const orderRes = await client.query(
      `INSERT INTO orders (order_code, user_id, product_id, quantity, unit_price, discount_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, order_code, created_at`,
      [orderCode, user.id, product.id, qty, product.price, discount, finalTotal]
    );
    const order = orderRes.rows[0];

    const itemIds = stockRes.rows.map((r: { id: number }) => r.id);
    await client.query(
      `UPDATE stock_items SET status = 'SOLD', order_id = $1, sold_at = NOW() WHERE id = ANY($2::bigint[])`,
      [order.id, itemIds]
    );

    await client.query(
      `INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, reference_code, description)
       VALUES ($1, 'PURCHASE', $2, $3, $4, $5, $6)`,
      [user.id, -finalTotal, user.balance, newBalance, orderCode, `Mua ${qty}x ${product.name}`]
    );

    await client.query('COMMIT');
    return NextResponse.json({
      status: 'success',
      orderCode: order.order_code,
      totalPaid: finalTotal,
      balanceAfter: newBalance,
      items: stockRes.rows.map((r: { payload: string }) => r.payload),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purchase TX error:', err);
    return NextResponse.json({ error: 'Lỗi hệ thống khi xử lý giao dịch.' }, { status: 500 });
  } finally {
    client.release();
  }
}
