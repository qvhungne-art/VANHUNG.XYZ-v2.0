import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDbPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ticketId = Number(body?.ticketId);
  if (!ticketId) return NextResponse.json({ error: 'Thiếu ticketId.' }, { status: 400 });

  const pool = getDbPool();
  await pool.query("UPDATE warranty_tickets SET status = 'Đã bảo hành đổi mới' WHERE id = $1", [ticketId]);
  return NextResponse.json({ ok: true });
}
