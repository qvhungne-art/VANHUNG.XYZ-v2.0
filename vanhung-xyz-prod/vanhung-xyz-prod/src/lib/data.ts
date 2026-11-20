import type { BankInfo, CategoryKey } from './types';

// Đổi số tài khoản & tên chủ tài khoản thật của bạn tại đây
export const BANKS: Record<string, BankInfo> = {
  MB: { bin: '970422', code: 'MB', name: 'MB Bank (Quân Đội)', acc: '0988999888', owner: 'NGUYEN VAN HUNG' },
  VCB: { bin: '970436', code: 'VCB', name: 'Vietcombank (VCB)', acc: '1029384756', owner: 'NGUYEN VAN HUNG' },
  TCB: { bin: '970407', code: 'TCB', name: 'Techcombank (TCB)', acc: '1903888999666', owner: 'NGUYEN VAN HUNG' },
  ACB: { bin: '970416', code: 'ACB', name: 'ACB (Á Châu)', acc: '226888999', owner: 'NGUYEN VAN HUNG' },
};

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'AI', label: 'Tài khoản AI' },
  { key: 'FB', label: 'Via & Clone FB' },
  { key: 'MAIL', label: 'Gmail & Mail Cổ' },
  { key: 'PROXY', label: 'Proxy & VPS' },
];

export const API_SNIPPETS: Record<'curl' | 'node' | 'sql', string> = {
  curl: `curl -X POST https://vanhung.xyz/api/orders/purchase \\
  -H "Content-Type: application/json" \\
  -d '{"productId": 1, "quantity": 2, "couponCode": "VANHUNG10"}'`,
  node: `const res = await fetch('/api/orders/purchase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId: 1, quantity: 2, couponCode: 'VANHUNG10' })
});
console.log(await res.json());`,
  sql: `BEGIN;
SELECT id, balance FROM users WHERE id = $1 FOR UPDATE;
SELECT id, payload FROM stock_items
 WHERE product_id = $2 AND status = 'AVAILABLE'
 ORDER BY id ASC LIMIT $3 FOR UPDATE SKIP LOCKED;
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
