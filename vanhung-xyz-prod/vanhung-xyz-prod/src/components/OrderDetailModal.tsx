'use client';

import React, { useState } from 'react';
import { X, Copy, Download, ShieldAlert } from 'lucide-react';
import { fmtVnd } from '@/lib/data';
import type { OrderRecord } from '@/lib/types';

interface OrderDetailModalProps {
  order: OrderRecord | null;
  onClose: () => void;
  onCopy: (text: string) => void;
  onWarrantySubmitted: () => void;
  onError: (msg: string) => void;
}

export default function OrderDetailModal({ order, onClose, onCopy, onWarrantySubmitted, onError }: OrderDetailModalProps) {
  const [showWarranty, setShowWarranty] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!order) return null;
  const textPayload = (order.items || []).join('\n');

  function handleDownload() {
    if (!order) return;
    const blob = new Blob([textPayload], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${order.order_code}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleWarranty(e: React.FormEvent) {
    e.preventDefault();
    if (!order || !reason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error || 'Không thể gửi bảo hành.'); return; }
      setReason('');
      setShowWarranty(false);
      onWarrantySubmitted();
    } catch {
      onError('Lỗi gửi yêu cầu bảo hành.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-panel rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{order.order_code}</span>
              <span className="text-xs font-semibold text-cyan-400">Xuất kho thành công</span>
            </div>
            <h3 className="text-lg font-bold mt-1 m-0">{order.product_name}</h3>
            <p className="text-xs font-mono mt-0.5 m-0 text-[var(--text-muted)]">
              SL: {order.quantity} · Tổng: {fmtVnd(order.total_amount)}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="w-8 h-8 rounded-lg surface-box flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <textarea rows={6} readOnly value={textPayload} className="w-full rounded-xl p-3 font-mono text-xs outline-none bg-[#04070E] text-emerald-300 border border-[var(--border-subtle)]" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button type="button" onClick={() => onCopy(textPayload)} className="py-2.5 rounded-xl surface-box text-xs font-bold flex items-center justify-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Sao chép tất cả</button>
          <button type="button" onClick={handleDownload} className="py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" /> Tải file .txt</button>
          <button type="button" onClick={() => setShowWarranty(!showWarranty)} className="py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/35 flex items-center justify-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Yêu cầu bảo hành</button>
        </div>

        {showWarranty && (
          <form className="surface-box rounded-xl p-4 space-y-3" onSubmit={handleWarranty}>
            <div className="text-sm font-bold text-amber-400">Gửi Yêu Cầu Bảo Hành 1 Đổi 1</div>
            <textarea rows={2} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mô tả dòng tài khoản lỗi..." className="w-full input-field rounded-lg p-2.5 text-xs" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowWarranty(false)} className="px-3 py-1.5 rounded-lg surface-box text-xs">Hủy</button>
              <button type="submit" disabled={busy} className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">{busy ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
            </div>
          </form>
        )}

        {order.warranty_status && (
          <div className="p-3 rounded-xl text-xs bg-amber-500/15 border border-amber-500/30 text-amber-300">
            Trạng thái bảo hành: <strong>{order.warranty_status}</strong> {order.warranty_reason ? `— "${order.warranty_reason}"` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
