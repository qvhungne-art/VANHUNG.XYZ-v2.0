'use client';

import React, { useState } from 'react';
import { BANKS, fmtVnd } from '@/lib/data';
import type { UserProfile } from '@/lib/types';

interface DepositSectionProps {
  user: UserProfile | null;
  onCopy: (text: string) => void;
  onRefreshBalance: () => void;
}

const CRYPTO_ADDRS: Record<'TRC20' | 'BEP20', string> = {
  TRC20: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  BEP20: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
};

export default function DepositSection({ user, onCopy, onRefreshBalance }: DepositSectionProps) {
  const [channel, setChannel] = useState<'bank' | 'ewallet' | 'crypto'>('bank');
  const [bankKey, setBankKey] = useState('MB');
  const [amount, setAmount] = useState(500000);
  const [cryptoNet, setCryptoNet] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [usdtAmt, setUsdtAmt] = useState(20);

  const bank = BANKS[bankKey] || BANKS.MB;
  const memo = user ? `VH ${user.id}` : 'VUI LONG DANG NHAP';
  const safeAmount = Math.max(10000, amount || 500000);
  const qrUrl = `https://img.vietqr.io/image/${bank.bin}-${bank.acc}-compact2.png?amount=${safeAmount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(bank.owner)}`;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase font-semibold text-emerald-400">/deposit · Hệ thống nạp tiền tự động 24/7</span>
          <h2 className="text-2xl font-extrabold m-0 mt-0.5">Nạp Tiền Đa Kênh</h2>
          <p className="text-sm mt-1 m-0 text-[var(--text-muted)]">
            Chuyển đúng nội dung chuyển khoản bên dưới — hệ thống SePay tự động cộng số dư vào ví sau 3–10 giây.
          </p>
        </div>
        <button type="button" onClick={onRefreshBalance} className="px-4 py-2 rounded-xl surface-box text-xs font-bold text-emerald-400">
          ↻ Kiểm tra lại số dư
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'bank', label: '1. Chuyển khoản Ngân hàng (VietQR)' },
          { key: 'ewallet', label: '2. Ví điện tử (MoMo / ZaloPay)' },
          { key: 'crypto', label: '3. Crypto (USDT TRC20 / BEP20)' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setChannel(t.key as 'bank' | 'ewallet' | 'crypto')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border ${
              channel === t.key ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'surface-box text-[var(--text-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {channel === 'bank' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Chọn ngân hàng nhận</label>
              <select value={bankKey} onChange={(e) => setBankKey(e.target.value)} className="w-full input-field rounded-xl px-4 py-2.5 text-sm font-medium">
                {Object.values(BANKS).map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Nhập số tiền muốn nạp (VNĐ)</label>
              <input type="number" min={10000} step={10000} value={amount} onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} className="w-full input-field rounded-xl px-4 py-2.5 font-mono text-base font-bold" />
              <div className="flex flex-wrap gap-2 mt-2.5">
                {[100000, 200000, 500000, 1000000, 2000000, 10000000].map((v) => (
                  <button key={v} type="button" onClick={() => setAmount(v)} className="px-3 py-1.5 rounded-lg surface-box text-xs font-mono">
                    {v >= 1000000 ? `${v / 1000000} Triệu` : `${v / 1000}K`}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl surface-box p-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Ngân hàng:</span><strong>{bank.name}</strong></div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <strong className="font-mono text-base">{bank.acc}</strong>
                  <button type="button" onClick={() => onCopy(bank.acc)} className="px-2.5 py-1 rounded-md input-field text-xs">Copy</button>
                </div>
              </div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Chủ tài khoản:</span><strong>{bank.owner}</strong></div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Nội dung chuyển khoản (bắt buộc):</span>
                <div className="flex items-center gap-2">
                  <strong className="font-mono text-base text-emerald-400">{memo}</strong>
                  <button type="button" onClick={() => onCopy(memo)} className="px-2.5 py-1 rounded-md bg-emerald-500 text-slate-950 font-bold text-xs">Copy</button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider font-semibold text-cyan-400">Quét mã VietQR</div>
            <div className="bg-white p-4 rounded-2xl shadow-lg inline-flex flex-col items-center">
              <img src={qrUrl} alt={`VietQR ${bank.name}`} className="w-56 h-56 object-contain rounded-lg" />
              <div className="mt-2 text-xs font-bold text-slate-900">{fmtVnd(safeAmount)} · {memo}</div>
            </div>
            <p className="text-xs m-0 max-w-xs text-[var(--text-muted)]">
              Sau khi chuyển khoản thành công, bấm <strong>Kiểm tra lại số dư</strong> hoặc tải lại trang.
            </p>
          </div>
        </div>
      )}

      {channel === 'ewallet' && (
        <div className="glass-panel rounded-2xl p-6 max-w-2xl space-y-4">
          <h3 className="text-lg font-bold m-0">Ví điện tử MoMo / ZaloPay</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div className="surface-box rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-pink-400">Ví MoMo</div>
              <div>SĐT: <strong className="font-mono">0988 999 888</strong></div>
              <div>Lời nhắn: <strong className="font-mono text-emerald-400">{memo}</strong></div>
            </div>
            <div className="surface-box rounded-xl p-4 space-y-1.5">
              <div className="font-bold text-sky-400">ZaloPay</div>
              <div>SĐT: <strong className="font-mono">0988 999 888</strong></div>
              <div>Lời nhắn: <strong className="font-mono text-emerald-400">{memo}</strong></div>
            </div>
          </div>
        </div>
      )}

      {channel === 'crypto' && (
        <div className="glass-panel rounded-2xl p-6 max-w-2xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-bold m-0">Nạp tự động Crypto (USDT)</h3>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400">1 USDT = 25.400đ</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select value={cryptoNet} onChange={(e) => setCryptoNet(e.target.value as 'TRC20' | 'BEP20')} className="input-field rounded-xl px-3 py-2 text-sm">
              <option value="TRC20">TRC20 (Tron)</option>
              <option value="BEP20">BEP20 (BNB Smart Chain)</option>
            </select>
            <input type="number" min={5} value={usdtAmt} onChange={(e) => setUsdtAmt(Math.max(5, Number(e.target.value) || 5))} className="input-field rounded-xl px-3 py-2 font-mono text-sm font-bold" />
          </div>
          <div className="surface-box rounded-xl p-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] text-[var(--text-muted)]">Địa chỉ ví nhận USDT ({cryptoNet})</div>
              <div className="font-mono text-xs sm:text-sm truncate font-bold text-cyan-400">{CRYPTO_ADDRS[cryptoNet]}</div>
            </div>
            <button type="button" onClick={() => onCopy(CRYPTO_ADDRS[cryptoNet])} className="px-3 py-1.5 rounded-lg input-field text-xs font-semibold shrink-0">Copy</button>
          </div>
          <div className="text-sm">Quy đổi thực nhận: <strong className="font-mono text-emerald-400">{fmtVnd(Math.round(usdtAmt * 25400))}</strong></div>
        </div>
      )}
    </section>
  );
}
