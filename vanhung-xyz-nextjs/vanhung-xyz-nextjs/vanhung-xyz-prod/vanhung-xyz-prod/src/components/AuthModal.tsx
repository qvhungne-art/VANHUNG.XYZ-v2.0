'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AuthModal({ open, initialMode, onClose, onSuccess, onError }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMode(initialMode); }, [initialMode, open]);
  if (!open) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error || 'Đăng nhập thất bại.'); return; }
      onSuccess(data.user.role === 'ADMIN' ? 'Đăng nhập thành công quyền ADMIN!' : `Xin chào ${data.user.username} (VH ${data.user.id})!`);
      onClose();
    } catch {
      onError('Không thể kết nối máy chủ.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: regPass }),
      });
      const data = await res.json();
      if (!res.ok) { onError(data.error || 'Đăng ký thất bại.'); return; }
      onSuccess(
        data.isFirstAdmin
          ? `Đăng ký thành công! Bạn là tài khoản đầu tiên nên đã được cấp quyền ADMIN (ID: VH ${data.user.id}).`
          : `Đăng ký thành công! Mã nạp VietQR của bạn là VH ${data.user.id}.`
      );
      onClose();
    } catch {
      onError('Không thể kết nối máy chủ.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-panel rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 relative">
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute top-4 right-4 w-8 h-8 rounded-lg surface-box flex items-center justify-center">
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="font-extrabold text-xl tracking-tight">
            VANHUNG<span className="text-sky-400">.XY</span><span className="text-emerald-400">Z</span>
          </div>
          <h2 className="text-lg font-bold m-0">{mode === 'register' ? 'Tạo tài khoản mới' : 'Đăng nhập hệ thống'}</h2>
          <p className="text-xs m-0 text-[var(--text-muted)]">Bảo mật mật khẩu scrypt &amp; lưu dữ liệu trực tiếp trên Neon PostgreSQL.</p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl surface-box">
          <button type="button" onClick={() => setMode('login')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'}`}>Đăng nhập</button>
          <button type="button" onClick={() => setMode('register')} className={`py-2 rounded-lg text-xs font-bold ${mode === 'register' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'}`}>Đăng ký</button>
        </div>

        {mode === 'login' ? (
          <form className="space-y-3.5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold mb-1">Email hoặc Tên đăng nhập</label>
              <input type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="ban@email.com" className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Mật khẩu</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm" />
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-50">
              {busy ? 'Đang xác thực...' : 'Đăng nhập ngay'}
            </button>
          </form>
        ) : (
          <form className="space-y-3.5" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs font-semibold mb-1">Tên hiển thị / Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="VD: vanhung" className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@email.com" className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Mật khẩu (tối thiểu 6 ký tự)</label>
              <input type="password" required minLength={6} value={regPass} onChange={(e) => setRegPass(e.target.value)} placeholder="Nhập mật khẩu bảo mật..." className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm" />
            </div>
            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500 disabled:opacity-50">
              {busy ? 'Đang tạo tài khoản...' : 'Đăng ký ngay'}
            </button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-[var(--border-subtle)]">
          <button type="button" onClick={onClose} className="text-xs text-[var(--text-muted)] hover:underline">
            Bỏ qua, xem gian hàng trước →
          </button>
        </div>
      </div>
    </div>
  );
}
