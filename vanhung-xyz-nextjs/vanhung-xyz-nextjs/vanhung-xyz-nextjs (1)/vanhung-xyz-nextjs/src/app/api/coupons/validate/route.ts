import { NextRequest, NextResponse } from 'next/server';
import { COUPONS } from '@/lib/data';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body?.code || '').trim().toUpperCase();
    const orderAmount = Number(body?.orderAmount || 0);
    const coupon = COUPONS[code];

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' }, { status: 404 });
    }
    if (orderAmount < coupon.minOrder) {
      return NextResponse.json(
        { valid: false, error: `Mã ${code} yêu cầu đơn tối thiểu ${coupon.minOrder.toLocaleString('vi-VN')}đ.` },
        { status: 400 }
      );
    }
    return NextResponse.json({ valid: true, coupon });
  } catch {
    return NextResponse.json({ valid: false, error: 'Dữ liệu yêu cầu không hợp lệ.' }, { status: 400 });
  }
}
