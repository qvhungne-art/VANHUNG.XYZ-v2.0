'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sun, Moon, LogOut } from 'lucide-react';
import { API_SNIPPETS, CATEGORIES, INITIAL_PRODUCTS, fmtVnd, getRankInfo, normalizeVi } from '@/lib/data';
import type { CategoryKey, OrderRecord, Product, ProductCategory, UserAccount } from '@/lib/types';
import AuthModal from './AuthModal';
import QuickBuyModal from './QuickBuyModal';
import OrderDetailModal from './OrderDetailModal';
import DepositSection from './DepositSection';

type TabKey = 'store' | 'deposit' | 'orders' | 'pricing' | 'tools' | 'admin';

const DEFAULT_DEMO_USER: UserAccount = {
  id: 10482,
  name: 'Khách Demo',
  email: 'demo@vanhung.xyz',
  pass: '123456',
  wallet: 1250000,
  totalDeposited: 1250000,
  orders: [],
  ledger: [
    {
      time: 'Khởi tạo',
      type: 'DEPOSIT',
      amount: 1250000,
      balanceAfter: 1250000,
      note: 'Số dư trải nghiệm demo · VH 10482',
    },
  ],
};

export default function StoreApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<TabKey>('store');
  const [usersDb, setUsersDb] = useState<UserAccount[]>([DEFAULT_DEMO_USER]);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'login' });

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [activeCat, setActiveCat] = useState<CategoryKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [buyProduct, setBuyProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);

  const [totpSecret, setTotpSecret] = useState('JBSWY3DPEHPK3PXP');
  const [totpNow, setTotpNow] = useState(0);
  const [apiLang, setApiLang] = useState<'curl' | 'node' | 'sql'>('curl');

  const [admName, setAdmName] = useState('');
  const [admCat, setAdmCat] = useState<ProductCategory>('AI');
  const [admPrice, setAdmPrice] = useState('');
  const [admStock, setAdmStock] = useState('');
  const [admWarranty, setAdmWarranty] = useState('30 ngày');

  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  function showToast(text: string, isError = false) {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg((prev) => (prev?.text === text ? null : prev)), 3000);
  }

  function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép vào bộ nhớ tạm!')).catch(() => {});
    }
  }

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('vh_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
      const rawDb = localStorage.getItem('vh_users_db');
      if (rawDb) {
        const parsed = JSON.parse(rawDb) as UserAccount[];
        if (Array.isArray(parsed) && parsed.length) setUsersDb(parsed);
      }
      const savedUid = parseInt(localStorage.getItem('vh_current_uid') || '0', 10);
      if (savedUid) {
        setCurrentUserId(savedUid);
      } else {
        setAuthModal({ open: true, mode: 'login' });
      }
    } catch {
      setAuthModal({ open: true, mode: 'login' });
    }
  }, []);

  // 2FA 1s interval
  useEffect(() => {
    setTotpNow(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => setTotpNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  function persistUsers(nextDb: UserAccount[], nextUid: number) {
    setUsersDb(nextDb);
    setCurrentUserId(nextUid);
    try {
      localStorage.setItem('vh_users_db', JSON.stringify(nextDb));
      localStorage.setItem('vh_current_uid', String(nextUid));
    } catch {}
  }

  const currentUser = useMemo(() => usersDb.find((u) => u.id === currentUserId) || null, [usersDb, currentUserId]);
  const rank = getRankInfo(currentUser?.totalDeposited || 0);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('vh_theme', next); } catch {}
  }

  function handleLogin(idf: string, pass: string): boolean {
    const q = idf.trim().toLowerCase();
    const found = usersDb.find((u) => (u.email.toLowerCase() === q || u.name.toLowerCase() === q) && u.pass === pass);
    if (!found) {
      showToast('Sai email/tên đăng nhập hoặc mật khẩu!', true);
      return false;
    }
    persistUsers(usersDb, found.id);
    showToast(`Xin chào ${found.name} (Mã nạp: VH ${found.id})!`);
    return true;
  }

  function handleRegister(name: string, email: string, pass: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    if (usersDb.some((u) => u.email.toLowerCase() === cleanEmail)) {
      showToast('Email này đã được đăng ký!', true);
      return false;
    }
    const newId = Math.floor(10000 + Math.random() * 89999);
    const newUser: UserAccount = {
      id: newId,
      name: name.trim(),
      email: cleanEmail,
      pass,
      wallet: 200000,
      totalDeposited: 0,
      orders: [],
      ledger: [
        {
          time: new Date().toLocaleString('vi-VN'),
          type: 'DEPOSIT',
          amount: 200000,
          balanceAfter: 200000,
          note: `Quà chào mừng thành viên mới · VH ${newId}`,
        },
      ],
    };
    persistUsers([...usersDb, newUser], newId);
    showToast(`Đăng ký thành công! Mã nạp VietQR của bạn là VH ${newId}`);
    return true;
  }

  function handleCreditDeposit(amount: number, channel: string) {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập để nạp tiền!', true);
      setAuthModal({ open: true, mode: 'login' });
      return;
    }
    const nextDb = usersDb.map((u) => {
      if (u.id !== currentUser.id) return u;
      const newWallet = u.wallet + amount;
      return {
        ...u,
        wallet: newWallet,
        totalDeposited: u.totalDeposited + amount,
        ledger: [
          {
            time: new Date().toLocaleString('vi-VN'),
            type: 'DEPOSIT' as const,
            amount,
            balanceAfter: newWallet,
            note: `${channel} · VH ${u.id}`,
          },
          ...u.ledger,
        ],
      };
    });
    persistUsers(nextDb, currentUser.id);
    showToast(`Auto Deposit: Đã cộng +${fmtVnd(amount)} vào ví!`);
  }

  function handleConfirmPurchase(product: Product, qty: number, total: number) {
    if (!currentUser) return;
    const lines: string[] = [];
    for (let i = 0; i < qty; i++) {
      const r = Math.random().toString(36).substring(2, 8).toUpperCase();
      if (product.cat === 'PROXY') lines.push(`103.142.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 250)}:8080:vh_${r}:Pass${r}#`);
      else if (product.cat === 'FB') lines.push(`1000${Math.floor(10000000000 + Math.random() * 89999999999)}|VhPass@${r}|JBSWY3DP${r}|mail_${r.toLowerCase()}@vanhung.xyz`);
      else lines.push(`user_${r.toLowerCase()}@vanhung.xyz|Pass#${r}2026|2FA_${r}`);
    }
    const orderCode = 'VH-' + Date.now().toString().slice(-6);
    const nowStr = new Date().toLocaleString('vi-VN');
    const newOrder: OrderRecord = {
      code: orderCode,
      product: product.name,
      qty,
      total,
      time: nowStr,
      data: lines.join('
'),
      warrantyTicket: null,
    };

    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: Math.max(0, p.stock - qty) } : p)));
    const nextDb = usersDb.map((u) => {
      if (u.id !== currentUser.id) return u;
      const newWallet = u.wallet - total;
      return {
        ...u,
        wallet: newWallet,
        orders: [newOrder, ...u.orders],
        ledger: [
          {
            time: nowStr,
            type: 'PURCHASE' as const,
            amount: -total,
            balanceAfter: newWallet,
            note: `Mua ${qty}x ${product.name.slice(0, 32)} · ${orderCode}`,
          },
          ...u.ledger,
        ],
      };
    });
    persistUsers(nextDb, currentUser.id);
    setBuyProduct(null);
    setActiveOrder(newOrder);
    showToast('Mua thành công! Đã trừ ví và chuyển sang chi tiết đơn hàng.');
  }

  function handleWarrantySubmit(orderCode: string, reason: string) {
    if (!currentUser) return;
    const ticket = { id: 'BH-' + Date.now().toString().slice(-4), reason, status: 'Đang kiểm tra đổi mới' };
    const nextDb = usersDb.map((u) => {
      if (u.id !== currentUser.id) return u;
      return {
        ...u,
        orders: u.orders.map((o) => (o.code === orderCode ? { ...o, warrantyTicket: ticket } : o)),
      };
    });
    persistUsers(nextDb, currentUser.id);
    setActiveOrder((prev) => (prev && prev.code === orderCode ? { ...prev, warrantyTicket: ticket } : prev));
    showToast(`Đã gửi yêu cầu bảo hành ${ticket.id}!`);
  }

  const filteredProducts = useMemo(() => {
    const q = normalizeVi(searchQuery);
    return products.filter((p) => {
      if (activeCat !== 'ALL' && p.cat !== activeCat) return false;
      if (!q) return true;
      return normalizeVi(`${p.name} ${p.cat} ${p.format} ${p.country}`).includes(q);
    });
  }, [products, activeCat, searchQuery]);

  const totpInfo = useMemo(() => {
    const rem = 30 - (totpNow % 30);
    const step = Math.floor(totpNow / 30);
    const s = totpSecret.trim() || 'VANHUNG';
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i) + step * 31) | 0;
    const code = String(Math.abs(hash) % 1000000).padStart(6, '0');
    return { code: `${code.slice(0, 3)} ${code.slice(3)}`, rem };
  }, [totpNow, totpSecret]);

  const allOrders = useMemo(() => usersDb.flatMap((u) => u.orders), [usersDb]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* LIVE TICKER */}
      <div className="ticker-wrap py-1.5 text-xs">
        <div className="ticker-move font-mono">
          <span className="mx-6">● [Vừa xong] user_huy*** mua 50 Gmail Cổ 2018-2020 (Row-Lock TX OK)</span>
          <span className="mx-6">● [1 phút trước] agency_minh*** nạp +5,000,000đ qua VietQR SePay (Auto 2.4s)</span>
          <span className="mx-6">● [2 phút trước] mmo_pro99*** mua 10 ChatGPT Plus Private 1 Tháng</span>
          <span className="mx-6">● [Vừa xong] user_huy*** mua 50 Gmail Cổ 2018-2020 (Row-Lock TX OK)</span>
          <span className="mx-6">● [1 phút trước] agency_minh*** nạp +5,000,000đ qua VietQR SePay (Auto 2.4s)</span>
        </div>
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-40 glass-panel border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <button type="button" onClick={() => setActiveTab('store')} className="flex items-center gap-2.5 text-left">
            <div className="w-10 h-10 rounded-xl p-[1.5px] bg-gradient-to-br from-emerald-400 via-cyan-500 to-sky-400">
              <div className="w-full h-full rounded-[10px] flex items-center justify-center bg-[var(--bg-primary)]">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.3">
                  <path d="M4 5l8 14L20 5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 5l3 5.5L15 5" stroke="#38BDF8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="font-extrabold text-base sm:text-lg tracking-tight leading-none">
                VANHUNG<span className="text-sky-600">.</span><span className="text-sky-500">X</span><span className="text-sky-400">Y</span><span className="text-emerald-400">Z</span>
              </div>
              <div className="text-[9.5px] font-mono tracking-widest uppercase mt-0.5 text-[var(--text-muted)]">NEXT.JS DIGITAL STORE</div>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-1 p-1 rounded-xl surface-box">
            {(
              [
                ['store', 'Gian hàng'],
                ['deposit', 'Nạp tiền'],
                ['orders', 'Đơn & Ví'],
                ['pricing', 'Bảng giá CTV'],
                ['tools', '2FA & API'],
                ['admin', 'Admin'],
              ] as [TabKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === key
                    ? 'bg-emerald-500/15 text-[var(--text-primary)] border border-emerald-500/35'
                    : key === 'admin'
                    ? 'text-amber-400 hover:bg-slate-800/40'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme} aria-label="Đổi Sáng/Tối" className="w-9 h-9 rounded-xl surface-box flex items-center justify-center">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!currentUser ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAuthModal({ open: true, mode: 'login' })} className="px-3.5 py-2 rounded-xl surface-box text-xs sm:text-sm font-semibold">Đăng nhập</button>
                <button type="button" onClick={() => setAuthModal({ open: true, mode: 'register' })} className="px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500">Đăng ký</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 surface-box rounded-xl px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono font-bold text-sm text-emerald-400">{fmtVnd(currentUser.wallet)}</span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{rank.code}</span>
                </div>
                <button type="button" onClick={() => setActiveTab('deposit')} className="px-3 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500">+ Nạp tiền</button>
                <div className="flex items-center gap-1.5 surface-box rounded-xl pl-2.5 pr-1.5 py-1">
                  <div className="text-right leading-tight hidden md:block">
                    <div className="text-xs font-bold">{currentUser.name}</div>
                    <div className="text-[10px] font-mono text-cyan-400">ID: VH {currentUser.id}</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Đăng xuất"
                    onClick={() => { persistUsers(usersDb, 0); showToast('Đã đăng xuất.'); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="xl:hidden flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto">
          {(
            [
              ['store', 'Gian hàng'],
              ['deposit', 'Nạp tiền'],
              ['orders', 'Đơn & Ví'],
              ['pricing', 'CTV'],
              ['tools', '2FA & API'],
              ['admin', 'Admin'],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                activeTab === key ? 'bg-emerald-500/20 text-emerald-400' : 'text-[var(--text-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        {activeTab === 'store' && (
          <section className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 sm:p-7 grid lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Next.js App Router + PostgreSQL Row-Level Locking · SePay Auto 3s
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight m-0">
                  Kho Tài Nguyên <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">MMO &amp; AI Thế Hệ Mới</span>
                </h1>
                <p className="text-sm sm:text-base max-w-2xl m-0 text-[var(--text-secondary)]">
                  Via Facebook, Gmail Cổ, Tài khoản AI (ChatGPT, Claude, Cursor), Proxy sạch tốc độ cao. Xuất kho tự động, tải .TXT tức thì và bảo hành 1 đổi 1.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {['VANHUNG10', 'MMO2026', 'NEWUSER50K'].map((code) => (
                    <button key={code} type="button" onClick={() => copyText(code)} className="px-3 py-1.5 rounded-lg surface-box text-emerald-400 font-bold">
                      Mã: {code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl surface-box">
                  <div className="text-xs text-[var(--text-muted)]">Đơn thành công</div>
                  <div className="text-xl font-bold font-mono mt-1">148,920+</div>
                  <div className="text-[11px] text-emerald-400 mt-1">↑ 99.8% Uptime</div>
                </div>
                <div className="p-4 rounded-xl surface-box">
                  <div className="text-xs text-[var(--text-muted)]">Tồn kho Live</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {products.reduce((s, p) => s + p.stock, 0).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Row-Lock Ready</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const cnt = c.key === 'ALL' ? products.length : products.filter((p) => p.cat === c.key).length;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setActiveCat(c.key)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
                        activeCat === c.key ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'surface-box text-[var(--text-muted)]'
                      }`}
                    >
                      {c.label} ({cnt})
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm Via, Gmail, ChatGPT, Proxy..."
                  className="input-field rounded-xl px-3.5 py-2 text-sm w-full sm:w-64"
                />
                <div className="flex surface-box rounded-xl p-1 shrink-0">
                  <button type="button" onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'table' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'}`}>Bảng Pro</button>
                  <button type="button" onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'}`}>Lưới Thẻ</button>
                </div>
              </div>
            </div>

            {viewMode === 'table' ? (
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-[11px] uppercase font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <tr>
                        <th className="p-4">Sản phẩm / Tài nguyên</th>
                        <th className="p-4 text-center">QG</th>
                        <th className="p-4 text-center">Bảo hành</th>
                        <th className="p-4 text-center">Tồn kho</th>
                        <th className="p-4 text-right">Đơn giá</th>
                        <th className="p-4 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[var(--surface-hover)]">
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {p.badge && <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/15 text-emerald-400">{p.badge}</span>}
                              <span className="font-semibold">{p.name}</span>
                            </div>
                            <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">Format: {p.format}</div>
                          </td>
                          <td className="p-4 text-center font-mono text-xs">{p.country}</td>
                          <td className="p-4 text-center"><span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 text-xs">{p.warranty}</span></td>
                          <td className={`p-4 text-center font-mono font-bold ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{p.stock.toLocaleString('vi-VN')}</td>
                          <td className="p-4 text-right font-mono font-bold">{fmtVnd(p.price)}</td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              disabled={p.stock === 0}
                              onClick={() => {
                                if (!currentUser) { showToast('Vui lòng đăng nhập để mua hàng!', true); setAuthModal({ open: true, mode: 'login' }); return; }
                                setBuyProduct(p);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs disabled:opacity-40"
                            >
                              Mua ngay
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((p) => (
                  <article key={p.id} className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded surface-box text-cyan-400">{p.cat} · {p.country}</span>
                        {p.badge && <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{p.badge}</span>}
                      </div>
                      <h3 className="font-bold text-base mt-3 mb-0">{p.name}</h3>
                      <div className="text-xs font-mono text-[var(--text-muted)] mt-1.5">Format: {p.format}</div>
                    </div>
                    <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <div className="text-lg font-mono font-extrabold text-emerald-400">{fmtVnd(p.price)}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Kho: {p.stock} · BH: {p.warranty}</div>
                      </div>
                      <button
                        type="button"
                        disabled={p.stock === 0}
                        onClick={() => {
                          if (!currentUser) { showToast('Vui lòng đăng nhập để mua hàng!', true); setAuthModal({ open: true, mode: 'login' }); return; }
                          setBuyProduct(p);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Mua ngay
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'deposit' && (
          <DepositSection user={currentUser} onCopy={copyText} onCreditDeposit={handleCreditDeposit} />
        )}

        {activeTab === 'orders' && (
          <section className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold m-0">Đơn Hàng Đã Mua</h2>
              {!currentUser || !currentUser.orders.length ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-sm text-[var(--text-muted)]">Chưa có đơn hàng nào.</div>
              ) : (
                currentUser.orders.map((o) => (
                  <article key={o.code} className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{o.code}</span>
                        <strong className="text-sm sm:text-base">{o.product}</strong>
                        {o.warrantyTicket && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">{o.warrantyTicket.id}</span>}
                      </div>
                      <div className="text-xs font-mono text-[var(--text-muted)] mt-1">{o.time} · SL: {o.qty} · <strong className="text-emerald-400">{fmtVnd(o.total)}</strong></div>
                    </div>
                    <button type="button" onClick={() => setActiveOrder(o)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
                      Chi tiết đơn / Bảo hành
                    </button>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold m-0">Biến Động Số Dư (Wallet Ledger)</h3>
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-xs uppercase font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                      <tr><th className="p-3.5">Thời gian</th><th className="p-3.5">Loại</th><th className="p-3.5">Số tiền</th><th className="p-3.5">Số dư sau</th><th className="p-3.5">Nội dung</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {(currentUser?.ledger || []).map((l, idx) => (
                        <tr key={idx}>
                          <td className="p-3.5 font-mono text-xs text-[var(--text-muted)]">{l.time}</td>
                          <td className="p-3.5">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${l.amount >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                              {l.amount >= 0 ? 'NẠP TIỀN' : 'MUA HÀNG'}
                            </span>
                          </td>
                          <td className={`p-3.5 font-mono font-bold ${l.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {l.amount >= 0 ? '+' : ''}{fmtVnd(l.amount)}
                          </td>
                          <td className="p-3.5 font-mono">{fmtVnd(l.balanceAfter)}</td>
                          <td className="p-3.5 text-xs text-[var(--text-secondary)]">{l.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'pricing' && (
          <section className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold m-0">Bảng Giá CTV &amp; Đại Lý</h2>
              <p className="text-sm text-[var(--text-muted)]">Tổng nạp tích lũy: <strong className="font-mono text-emerald-400">{fmtVnd(currentUser?.totalDeposited || 0)}</strong></p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { lv: 'Cấp 1', title: 'Thành Viên', disc: '0%', req: '0đ' },
                { lv: 'Cấp 2', title: 'Cộng Tác Viên', disc: '-5%', req: '2.000.000đ' },
                { lv: 'Cấp 3', title: 'Đại Lý VIP', disc: '-12%', req: '10.000.000đ' },
                { lv: 'Cấp 4', title: 'Tổng Kho / Agency', disc: '-20%', req: '50.000.000đ' },
              ].map((t) => (
                <article key={t.lv} className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono text-emerald-400">{t.lv}</div>
                    <h3 className="text-xl font-bold mt-1">{t.title}</h3>
                    <div className="text-3xl font-mono font-extrabold mt-4 text-emerald-400">{t.disc}</div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">Tổng nạp từ: {t.req}</p>
                  </div>
                  <button type="button" onClick={() => setActiveTab('deposit')} className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">
                    Nạp tiền ngay
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'tools' && (
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold m-0">Công Cụ Lấy Mã 2FA Live (TOTP 30s)</h2>
              <input value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} className="w-full input-field rounded-xl px-4 py-2.5 font-mono text-sm uppercase" />
              <div className="p-5 rounded-xl surface-box flex items-center justify-between">
                <div>
                  <div className="text-xs text-[var(--text-muted)]">Mã 6 số</div>
                  <div className="text-3xl font-mono font-extrabold text-emerald-400 mt-1">{totpInfo.code}</div>
                </div>
                <div className="text-xl font-mono font-bold text-cyan-400">{totpInfo.rem}s</div>
              </div>
              <button type="button" onClick={() => copyText(totpInfo.code.replace(/\s/g, ''))} className="w-full py-2.5 rounded-xl surface-box text-sm font-semibold">Sao chép mã 2FA</button>
            </div>

            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold m-0">API Mua Hàng (Row-Level Locking)</h2>
                <div className="flex gap-1.5">
                  {(['curl', 'node', 'sql'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setApiLang(l)} className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold ${apiLang === l ? 'bg-indigo-500 text-white' : 'surface-box text-[var(--text-muted)]'}`}>
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <pre className="rounded-xl p-4 text-xs font-mono overflow-x-auto bg-[#04070E] text-emerald-300 border border-[var(--border-subtle)] m-0">
                {API_SNIPPETS[apiLang]}
              </pre>
            </div>
          </section>
        )}

        {activeTab === 'admin' && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold m-0">Admin Dashboard — VANHUNG.XYZ</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Doanh thu</div><div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{fmtVnd(allOrders.reduce((s, o) => s + o.total, 0))}</div></div>
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Sản phẩm</div><div className="text-2xl font-mono font-bold mt-1">{products.length}</div></div>
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Đơn xuất kho</div><div className="text-2xl font-mono font-bold text-cyan-400 mt-1">{allOrders.length}</div></div>
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Bảo hành</div><div className="text-2xl font-mono font-bold text-amber-400 mt-1">{allOrders.filter((o) => o.warrantyTicket).length}</div></div>
            </div>

            <form
              className="glass-panel rounded-2xl p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const price = parseInt(admPrice, 10), stock = parseInt(admStock, 10);
                if (!admName.trim() || !price || !stock) return;
                setProducts((prev) => [{ id: Date.now(), cat: admCat, name: admName.trim(), price, stock, badge: 'NEW', country: 'VN', warranty: admWarranty || '30 ngày', format: 'user|pass|2fa' }, ...prev]);
                setAdmName(''); setAdmPrice(''); setAdmStock('');
                showToast('Đã đăng bán sản phẩm mới!');
              }}
            >
              <h3 className="font-bold text-lg m-0">Thêm Sản Phẩm Mới</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
                <input value={admName} onChange={(e) => setAdmName(e.target.value)} placeholder="Tên sản phẩm..." required className="lg:col-span-2 input-field rounded-xl px-3.5 py-2.5 text-sm" />
                <select value={admCat} onChange={(e) => setAdmCat(e.target.value as ProductCategory)} className="input-field rounded-xl px-3.5 py-2.5 text-sm">
                  <option value="AI">Tài khoản AI</option><option value="FB">Via &amp; Clone FB</option><option value="MAIL">Gmail &amp; Mail Cổ</option><option value="PROXY">Proxy &amp; VPS</option>
                </select>
                <input type="number" value={admPrice} onChange={(e) => setAdmPrice(e.target.value)} placeholder="Giá (VNĐ)" required className="input-field rounded-xl px-3.5 py-2.5 text-sm" />
                <input type="number" value={admStock} onChange={(e) => setAdmStock(e.target.value)} placeholder="Tồn kho" required className="input-field rounded-xl px-3.5 py-2.5 text-sm" />
                <input value={admWarranty} onChange={(e) => setAdmWarranty(e.target.value)} placeholder="Bảo hành" className="input-field rounded-xl px-3.5 py-2.5 text-sm" />
              </div>
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">+ Đăng bán ngay</button>
            </form>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-xs border-t border-[var(--border-subtle)] text-[var(--text-muted)]">
        &copy; 2026 <strong>VANHUNG.XYZ</strong> — Next.js Full-Stack Automated Digital Store.
      </footer>

      <AuthModal
        open={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((prev) => ({ ...prev, open: false }))}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <QuickBuyModal
        product={buyProduct}
        user={currentUser}
        onClose={() => setBuyProduct(null)}
        onGoDeposit={() => setActiveTab('deposit')}
        onConfirmPurchase={handleConfirmPurchase}
      />

      <OrderDetailModal
        order={activeOrder}
        onClose={() => setActiveOrder(null)}
        onCopy={copyText}
        onSubmitWarranty={handleWarrantySubmit}
      />

      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-2xl ${
            toastMsg.isError ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
