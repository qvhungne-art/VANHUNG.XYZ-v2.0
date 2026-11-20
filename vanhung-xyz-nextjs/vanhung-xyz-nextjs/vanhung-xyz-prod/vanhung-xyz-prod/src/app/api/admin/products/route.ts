import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name || '').trim();
  const category = String(body?.category || 'AI').trim();
  const price = parseInt(String(body?.price || 0), 10);
  const warranty = String(body?.warranty || '30 ngày').trim();
  const formatHint = String(body?.format_hint || 'user|pass|2fa').trim();
  const country = String(body?.country || 'VN').trim();
  const badge = String(body?.badge || 'NEW').trim();

  if (!name || price < 0) return NextResponse.json({ error: 'Thiếu tên hoặc giá sản phẩm.' }, { status: 400 });

  const pool = getDbPool();
  const ins = await pool.query(
    `INSERT INTO products (category, name, price, country, badge, warranty, format_hint)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [category, name, price, country, badge, warranty, formatHint]
  );
  return NextResponse.json({ id: Number(ins.rows[0].id) });
}

export async function DELETE(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Thiếu ID sản phẩm.' }, { status: 400 });
  const pool = getDbPool();
  await pool.query('UPDATE products SET is_active = FALSE WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
