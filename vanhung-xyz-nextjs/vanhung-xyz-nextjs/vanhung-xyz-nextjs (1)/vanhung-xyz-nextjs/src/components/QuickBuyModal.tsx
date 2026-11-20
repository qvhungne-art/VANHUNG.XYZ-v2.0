'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { COUPONS, fmtVnd, getRankInfo } from '@/lib/data';
import type { CouponInfo, Product, UserAccount } from '@/lib/types';

interface QuickBuyModalProps {
  product: Product | null;
  user: UserAccount | null;
  onClose: () => void;
  onGoDeposit: () => void;
  onConfirmPurchase: (product: Product, qty: number, total: number, couponCode?: string) => void;
}

export default function QuickBuyModal({ product, user, onClose, onGoDeposit, onConfirmPurchase }: QuickBuyModalProps) {
  const [qty, setQty] = useState(1);
  const [promoInput, setPromoInput] = useState('');
  const [coupon, setCoupon] = useState<CouponInfo | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQty(1);
    setPromoInput('');
    setCoupon(null);
    setPromoMsg(null);
    setLoading(false);
  }, [product]);

  if (!product) return null;

  const safeQty = Math.max(1, Math.min(product.stock, qty));
  const rawTotal = safeQty * product.price;
  const rank = getRankInfo(user?.totalDeposited || 0);
  const rankDisc = Math.round(rawTotal * rank.rate);
  const afterRank = rawTotal - rankDisc;
  const couponDisc =
    coupon && afterRank >= coupon.minOrder
      ? coupon.type === 'percent'
        ? Math.round(afterRank * (coupon.value / 100))
        : coupon.value
      : 0;
  const totalDiscount = Math.min(rawTotal, rankDisc + couponDisc);
  const finalTotal = Math.max(0, rawTotal - totalDiscount);
  const insufficient = !user || user.wallet < finalTotal;

  async function handleValidateCoupon() {
    const code = promoInput.trim().toUpperCase();
    if (!code) {
      setCoupon(null);
      setPromoMsg(null);
      return;
    }
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orderAmount: rawTotal }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCoupon(data.coupon);
        setPromoMsg({ text: `✓ Hợp lệ: ${data.coupon.label}`, ok: true });
        return;
      }
      setCoupon(null);
      setPromoMsg({ text: `✕ ${data.error || 'Mã không hợp lệ'}`, ok: false });
    } catch {
      const fallback = COUPONS[code];
      if (fallback && rawTotal >= fallback.minOrder) {
        setCoupon(fallback);
        setPromoMsg({ text: `✓ Hợp lệ: ${fallback.label}`, ok: true });
      } else {
        setCoupon(null);
        setPromoMsg({ text: '✕ Mã giảm giá không hợp lệ hoặc chưa đạt đơn tối thiểu.', ok: false });
      }
    }
  }

  function handleBuy() {
    if (insufficient || loading || !product) return;
    setLoading(true);
    setTimeout(() => {
      onConfirmPurchase(product, safeQty, finalTotal, coupon?.code);
      setLoading(false);
    }, 450);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-panel rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
              {product.cat} · BH {product.warranty}
            </span>
            <h3 className="text-lg font-bold mt-1.5 m-0">{product.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-lg surface-box flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between surface-box p-3.5 rounded-xl">
          <div>
            <div className="text-sm font-medium">Số lượng mua</div>
            <div className="text-[11px] font-mono text-[var(--text-muted)]">Tối đa theo tồn kho: {product.stock.toLocaleString('vi-VN')}</div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setQty(Math.max(1, safeQty - 1))} className="w-8 h-8 rounded-lg input-field font-bold">-</button>
            <input
              type="number"
              min={1}
              max={product.stock}
              value={safeQty}
              onChange={(e) => setQty(Math.max(1, Math.min(product.stock, parseInt(e.target.value, 10) || 1)))}
              className="w-16 text-center input-field rounded-lg py-1 font-mono font-bold text-sm"
            />
            <button type="button" onClick={() => setQty(Math.min(product.stock, safeQty + 1))} className="w-8 h-8 rounded-lg input-field font-bold">+</button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Mã giảm giá (VANHUNG10, MMO2026)"
              className="flex-1 input-field rounded-xl px-3.5 py-2 text-xs sm:text-sm font-mono uppercase"
            />
            <button type="button" onClick={handleValidateCoupon} className="px-4 py-2 rounded-xl surface-box text-xs font-semibold shrink-0 hover:brightness-110">
              Kiểm tra
            </button>
          </div>
          {promoMsg && (
            <div className={`text-xs ${promoMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{promoMsg.text}</div>
          )}
        </div>

        <div className="p-4 rounded-xl surface-box space-y-1.5 text-sm">
          <div className="flex justify-between text-[var(--text-muted)]">
            <span>Đơn giá:</span>
            <span className="font-mono">{fmtVnd(product.price)}</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>Giảm giá (Hạng {rank.label} + Coupon):</span>
            <span className="font-mono">{totalDiscount > 0 ? `-${fmtVnd(totalDiscount)}` : '0đ'}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border-subtle)]">
            <span>Tổng thanh toán:</span>
            <span className="font-mono text-emerald-400">{fmtVnd(finalTotal)}</span>
          </div>
          <div className="flex justify-between text-xs pt-1 text-[var(--text-muted)]">
            <span>Số dư hiện tại:</span>
            <span className="font-mono font-bold">{fmtVnd(user?.wallet || 0)}</span>
          </div>
        </div>

        {insufficient && (
          <div className="p-3 rounded-xl flex items-center justify-between gap-2 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <span>Số dư ví không đủ để thanh toán đơn này.</span>
            <button
              type="button"
              onClick={() => { onClose(); onGoDeposit(); }}
              className="px-2.5 py-1 rounded-lg bg-rose-500 text-white font-bold shrink-0"
            >
              Nạp ngay
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={insufficient || loading}
          onClick={handleBuy}
          className="w-full py-3 rounded-xl text-slate-950 font-extrabold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-50 transition"
        >
          {loading ? 'Đang khóa giao dịch & Xuất kho...' : 'Xác Nhận Mua & Giao Tự Động'}
        </button>
      </div>
    </div>
  );
}
