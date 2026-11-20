'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AuthModalProps {
  open: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onLogin: (identifier: string, pass: string) => boolean;
  onRegister: (name: string, email: string, pass: string) => boolean;
}

export default function AuthModal({ open, initialMode, onClose, onLogin, onRegister }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginId, setLoginId] = useState('demo@vanhung.xyz');
  const [loginPass, setLoginPass] = useState('123456');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-panel rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg surface-box flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="font-extrabold text-xl tracking-tight">
            VANHUNG<span className="text-sky-400">.XY</span><span className="text-emerald-400">Z</span>
          </div>
          <h2 className="text-lg font-bold m-0">
            {mode === 'register' ? 'Tạo tài khoản khách hàng' : 'Đăng nhập VANHUNG.XYZ'}
          </h2>
          <p className="text-xs m-0 text-[var(--text-muted)]">
            Đăng nhập hoặc đăng ký để nhận mã nạp VietQR định danh và lịch sử đơn hàng.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl surface-box">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              mode === 'login' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              mode === 'register' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'
            }`}
          >
            Đăng ký tài khoản
          </button>
        </div>

        {mode === 'login' ? (
          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (onLogin(loginId, loginPass)) onClose();
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Email hoặc Tên đăng nhập</label>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Mật khẩu</label>
              <input
                type="password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-105 transition"
            >
              Đăng nhập ngay
            </button>
            <p className="text-[11px] text-center m-0 text-[var(--text-muted)]">
              Tài khoản dùng thử: <span className="font-mono">demo@vanhung.xyz</span> / <span className="font-mono">123456</span>
            </p>
          </form>
        ) : (
          <form
            className="space-y-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (onRegister(regName, regEmail, regPass)) onClose();
            }}
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Tên hiển thị / Username</label>
              <input
                type="text"
                required
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="VD: hungmmo99"
                className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email nhận đơn hàng</label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="ban@email.com"
                className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Mật khẩu (tối thiểu 6 ký tự)</label>
              <input
                type="password"
                required
                minLength={6}
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
                className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:brightness-105 transition"
            >
              Tạo tài khoản &amp; Nhận mã nạp riêng
            </button>
          </form>
        )}

        <div className="pt-2 text-center border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-[var(--text-muted)] hover:underline"
          >
            Bỏ qua, xem trước gian hàng với tư cách Khách →
          </button>
        </div>
      </div>
    </div>
  );
}
