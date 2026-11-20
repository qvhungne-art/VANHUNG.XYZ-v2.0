import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const productId = Number(body?.productId);
  const rawLines = String(body?.lines || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!productId || !rawLines.length) {
    return NextResponse.json({ error: 'Vui lòng chọn sản phẩm và dán ít nhất 1 dòng tài khoản.' }, { status: 400 });
  }

  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const payload of rawLines) {
      await client.query(
        `INSERT INTO stock_items (product_id, payload, status) VALUES ($1, $2, 'AVAILABLE')`,
        [productId, payload]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ inserted: rawLines.length });
  } catch {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: 'Lỗi nạp kho tài nguyên.' }, { status: 500 });
  } finally {
    client.release();
  }
}
