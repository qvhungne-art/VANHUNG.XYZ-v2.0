import type { BankInfo, CategoryKey, CouponInfo, Product } from './types';

export const BANKS: Record<string, BankInfo> = {
  MB: { bin: '970422', code: 'MB', name: 'MB Bank (Quân Đội)', acc: '0988999888', owner: 'NGUYEN VAN HUNG' },
  VCB: { bin: '970436', code: 'VCB', name: 'Vietcombank (VCB)', acc: '1029384756', owner: 'NGUYEN VAN HUNG' },
  TCB: { bin: '970407', code: 'TCB', name: 'Techcombank (TCB)', acc: '1903888999666', owner: 'NGUYEN VAN HUNG' },
  ACB: { bin: '970416', code: 'ACB', name: 'ACB (Á Châu)', acc: '226888999', owner: 'NGUYEN VAN HUNG' },
};

export const COUPONS: Record<string, CouponInfo> = {
  VANHUNG10: { code: 'VANHUNG10', type: 'percent', value: 10, minOrder: 0, label: 'Giảm 10% toàn đơn' },
  MMO2026: { code: 'MMO2026', type: 'percent', value: 15, minOrder: 100000, label: 'Mã VIP giảm 15% (đơn từ 100K)' },
  NEWUSER50K: { code: 'NEWUSER50K', type: 'fixed', value: 50000, minOrder: 200000, label: 'Giảm thẳng 50.000đ (đơn từ 200K)' },
};

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, cat: 'AI', name: 'ChatGPT Plus Private (Cấp riêng 1 Tháng - Bảo hành Full)', price: 145000, stock: 84, badge: 'HOT', country: 'US', warranty: '30 ngày', format: 'email|pass|2fa' },
  { id: 2, cat: 'AI', name: 'Claude Pro 3.7 Sonnet (Tài khoản chính chủ, không chung)', price: 320000, stock: 26, badge: 'VIP', country: 'US', warranty: '30 ngày', format: 'email|pass' },
  { id: 3, cat: 'AI', name: 'Cursor Pro 14 Ngày / 1 Tháng (Fast Request Full)', price: 110000, stock: 52, badge: 'NEW', country: 'US', warranty: '14 ngày', format: 'email|pass' },
  { id: 4, cat: 'FB', name: 'Via Việt XMDT Cổ 2015-2020 (Đã bật 2FA, bao đổi pass)', price: 75000, stock: 310, badge: 'HOT', country: 'VN', warranty: '24h Login', format: 'uid|pass|2fa|mail|passmail' },
  { id: 5, cat: 'FB', name: 'Via Phi Kháng 902 Limit 5m8 (Chạy Ads siêu khỏe)', price: 165000, stock: 95, badge: 'ADS', country: 'PH', warranty: '24h Login', format: 'uid|pass|2fa|cookie' },
  { id: 6, cat: 'FB', name: 'Clone Việt NVR Tương Tác Thật (Reg Phone sạch)', price: 6500, stock: 2450, badge: '', country: 'VN', warranty: 'Check Live', format: 'uid|pass|2fa' },
  { id: 7, cat: 'MAIL', name: 'Gmail Cổ 2014-2018 (Trust cao, đã ngâm IP sạch)', price: 18000, stock: 1280, badge: 'HOT', country: 'US', warranty: '48h Login', format: 'mail|pass|recovery' },
  { id: 8, cat: 'MAIL', name: 'Hotmail / Outlook Live (Mở sẵn IMAP/POP3 đọc OTP)', price: 1200, stock: 6800, badge: '', country: 'GL', warranty: 'Check Live', format: 'mail|pass|refresh_token' },
  { id: 9, cat: 'PROXY', name: 'Proxy Dân Cư Việt Nam Private (IPv4 Tĩnh 30 Ngày)', price: 35000, stock: 420, badge: 'FAST', country: 'VN', warranty: '30 ngày', format: 'ip:port:user:pass' },
  { id: 10, cat: 'PROXY', name: 'Proxy ISP US Tĩnh (Sạch 100% nuôi Ebay / Etsy / TikTok)', price: 55000, stock: 190, badge: 'CLEAN', country: 'US', warranty: '30 ngày', format: 'ip:port:user:pass' },
];

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'AI', label: 'Tài khoản AI' },
  { key: 'FB', label: 'Via & Clone FB' },
  { key: 'MAIL', label: 'Gmail & Mail Cổ' },
  { key: 'PROXY', label: 'Proxy & VPS' },
];

export const API_SNIPPETS: Record<'curl' | 'node' | 'sql', string> = {
  curl: `curl -X POST https://vanhung.xyz/api/orders/purchase \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": 10482, "productId": 1, "quantity": 5, "couponCode": "VANHUNG10"}'`,
  node: `const res = await fetch('/api/orders/purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 10482, productId: 1, quantity: 2, couponCode: 'VANHUNG10' })
});
console.log(await res.json());`,
  sql: `BEGIN;
-- 1. Khóa dòng ví người dùng (chống trừ âm số dư)
SELECT id, balance FROM users WHERE id = $1 FOR UPDATE;
-- 2. Khóa đúng N item chưa bán (chống bán trùng khi mua đồng thời)
SELECT id, payload FROM stock_items
 WHERE product_id = $2 AND status = 'AVAILABLE'
 ORDER BY id ASC LIMIT $3 FOR UPDATE SKIP LOCKED;
-- 3. Trừ ví + Ghi Biến động số dư + Gán vào đơn hàng
COMMIT;`,
};

export function fmtVnd(n: number): string {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ';
}

export function normalizeVi(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function getRankInfo(totalDeposited: number): { code: string; rate: number; label: string } {
  if (totalDeposited >= 50000000) return { code: 'AGENCY', rate: 0.2, label: '20%' };
  if (totalDeposited >= 10000000) return { code: 'VIP', rate: 0.12, label: '12%' };
  if (totalDeposited >= 2000000) return { code: 'CTV', rate: 0.05, label: '5%' };
  return { code: 'LV1', rate: 0, label: '0%' };
}
