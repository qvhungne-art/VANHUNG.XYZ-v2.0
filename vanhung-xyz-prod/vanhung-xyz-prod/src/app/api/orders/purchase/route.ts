import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getRankInfo } from '@/lib/data';

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: 'Vui lòng đăng nhập để mua hàng.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const productId = Number(body?.productId);
  const qty = parseInt(String(body?.quantity || 0), 10);
  const couponCode = body?.couponCode ? String(body.couponCode).trim().toUpperCase() : null;

  if (!productId || !Number.isInteger(qty) || qty < 1) {
    return NextResponse.json({ error: 'Số lượng hoặc sản phẩm không hợp lệ.' }, { status: 400 });
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Row-Level Lock ví người dùng
    const userRes = await client.query(
      'SELECT id, balance, total_deposited FROM users WHERE id = $1 FOR UPDATE',
      [sessionUser.id]
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

    // 2. Row-Level Lock đúng N item chưa bán (FOR UPDATE SKIP LOCKED)
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
        { error: `Kho hiện chỉ còn ${stockRes.rows.length} sản phẩm khả dụng.` },
        { status: 409 }
      );
    }

    const rawTotal = Number(product.price) * qty;
    const rank = getRankInfo(Number(user.total_deposited));
    const rankDisc = Math.round(rawTotal * rank.rate);
    const afterRank = rawTotal - rankDisc;
    let couponDisc = 0;

    if (couponCode) {
      const cRes = await client.query(
        `SELECT discount_type, discount_value, min_order
           FROM coupons
          WHERE code = $1 AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
        [couponCode]
      );
      if (cRes.rows.length && afterRank >= Number(cRes.rows[0].min_order)) {
        const c = cRes.rows[0];
        couponDisc =
          c.discount_type === 'PERCENT'
            ? Math.round(afterRank * (Number(c.discount_value) / 100))
            : Number(c.discount_value);
      }
    }

    const totalDiscount = Math.min(rawTotal, rankDisc + couponDisc);
    const finalTotal = Math.max(0, rawTotal - totalDiscount);

    if (Number(user.balance) < finalTotal) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Số dư ví không đủ để thanh toán.' }, { status: 402 });
    }

    const newBalance = Number(user.balance) - finalTotal;
    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, user.id]);

    const orderCode = 'VH-' + Date.now().toString().slice(-6);
    const orderRes = await client.query(
      `INSERT INTO orders (order_code, user_id, product_id, quantity, unit_price, discount_amount, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, order_code, created_at`,
      [orderCode, user.id, product.id, qty, product.price, totalDiscount, finalTotal]
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
      order: {
        id: Number(order.id),
        order_code: order.order_code,
        product_name: product.name,
        quantity: qty,
        total_amount: finalTotal,
        created_at: order.created_at,
        items: stockRes.rows.map((r: { payload: string }) => r.payload),
        warranty_status: null,
        warranty_reason: null,
      },
      balanceAfter: newBalance,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Purchase error:', err);
    return NextResponse.json({ error: 'Lỗi xử lý giao dịch.' }, { status: 500 });
  } finally {
    client.release();
  }
}
