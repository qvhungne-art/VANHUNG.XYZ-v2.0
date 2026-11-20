'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sun, Moon, LogOut, ShieldCheck } from 'lucide-react';
import { API_SNIPPETS, CATEGORIES, fmtVnd, getRankInfo, normalizeVi } from '@/lib/data';
import type { CategoryKey, LedgerEntry, OrderRecord, Product, ProductCategory, UserProfile, WarrantyTicket } from '@/lib/types';
import AuthModal from './AuthModal';
import QuickBuyModal from './QuickBuyModal';
import OrderDetailModal from './OrderDetailModal';
import DepositSection from './DepositSection';

type TabKey = 'store' | 'deposit' | 'orders' | 'pricing' | 'tools' | 'admin';

export default function StoreApp() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<TabKey>('store');

  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({ open: false, mode: 'login' });

  const [activeCat, setActiveCat] = useState<CategoryKey>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [buyProduct, setBuyProduct] = useState<Product | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);

  const [totpSecret, setTotpSecret] = useState('JBSWY3DPEHPK3PXP');
  const [totpNow, setTotpNow] = useState(0);
  const [apiLang, setApiLang] = useState<'curl' | 'node' | 'sql'>('curl');

  // Admin states
  const [adminStats, setAdminStats] = useState<{ revenue: number; totalOrders: number; users: UserProfile[]; warranties: WarrantyTicket[] }>({
    revenue: 0, totalOrders: 0, users: [], warranties: [],
  });
  const [admName, setAdmName] = useState('');
  const [admCat, setAdmCat] = useState<ProductCategory>('AI');
  const [admPrice, setAdmPrice] = useState('');
  const [admWarranty, setAdmWarranty] = useState('30 ngày');
  const [stockProdId, setStockProdId] = useState<number>(0);
  const [stockLines, setStockLines] = useState('');

  const [toastMsg, setToastMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  function showToast(text: string, isError = false) {
    setToastMsg({ text, isError });
    setTimeout(() => setToastMsg((prev) => (prev?.text === text ? null : prev)), 3200);
  }

  function copyText(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Đã sao chép vào bộ nhớ tạm!')).catch(() => {});
    }
  }

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data.products)) {
        setProducts(data.products);
        if (data.products.length && !stockProdId) setStockProdId(data.products[0].id);
      }
    } catch {}
  }, [stockProdId]);

  const loadSession = useCallback(async (openIfGuest = false) => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setUser(data.user || null);
      setOrders(data.orders || []);
      setLedger(data.ledger || []);
      if (!data.user && openIfGuest) {
        setAuthModal({ open: true, mode: 'login' });
      }
    } catch {}
  }, []);

  const loadAdminOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAdminStats(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vh_theme');
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        document.documentElement.setAttribute('data-theme', saved);
      }
    } catch {}
    loadProducts();
    loadSession(true);
  }, [loadProducts, loadSession]);

  useEffect(() => {
    if (activeTab === 'admin' && user?.role === 'ADMIN') {
      loadAdminOverview();
    }
  }, [activeTab, user, loadAdminOverview]);

  useEffect(() => {
    setTotpNow(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => setTotpNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const rank = getRankInfo(user?.total_deposited || 0);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('vh_theme', next); } catch {}
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setOrders([]);
    setLedger([]);
    setActiveTab('store');
    showToast('Đã đăng xuất.');
  }

  const filteredProducts = useMemo(() => {
    const q = normalizeVi(searchQuery);
    return products.filter((p) => {
      if (activeCat !== 'ALL' && p.category !== activeCat) return false;
      if (!q) return true;
      return normalizeVi(`${p.name} ${p.category} ${p.format_hint} ${p.country}`).includes(q);
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

  const navItems: [TabKey, string][] = isAdmin
    ? [
        ['store', 'Gian hàng'],
        ['deposit', 'Nạp tiền'],
        ['orders', 'Đơn & Ví'],
        ['pricing', 'Bảng giá CTV'],
        ['tools', '2FA & API'],
        ['admin', 'Admin'],
      ]
    : [
        ['store', 'Gian hàng'],
        ['deposit', 'Nạp tiền'],
        ['orders', 'Đơn & Ví'],
        ['pricing', 'Bảng giá CTV'],
        ['tools', '2FA & API'],
      ];

  return (
    <div className="min-h-screen flex flex-col">
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
              <div className="text-[9.5px] font-mono tracking-widest uppercase mt-0.5 text-[var(--text-muted)]">VANHUNG DIGITAL STORE</div>
            </div>
          </button>

          <nav className="hidden xl:flex items-center gap-1 p-1 rounded-xl surface-box">
            {navItems.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === key
                    ? 'bg-emerald-500/15 text-[var(--text-primary)] border border-emerald-500/35'
                    : key === 'admin'
                    ? 'text-amber-400 font-semibold'
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

            {!user ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAuthModal({ open: true, mode: 'login' })} className="px-3.5 py-2 rounded-xl surface-box text-xs sm:text-sm font-semibold">Đăng nhập</button>
                <button type="button" onClick={() => setAuthModal({ open: true, mode: 'register' })} className="px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500">Đăng ký</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 surface-box rounded-xl px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono font-bold text-sm text-emerald-400">{fmtVnd(user.balance)}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                    {isAdmin ? 'ADMIN' : rank.code}
                  </span>
                </div>
                <button type="button" onClick={() => setActiveTab('deposit')} className="px-3 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-500 to-cyan-500">+ Nạp tiền</button>
                <div className="flex items-center gap-1.5 surface-box rounded-xl pl-2.5 pr-1.5 py-1">
                  <div className="text-right leading-tight hidden md:block">
                    <div className="text-xs font-bold flex items-center gap-1 justify-end">
                      {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                      {user.username}
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400">ID: VH {user.id}</div>
                  </div>
                  <button type="button" aria-label="Đăng xuất" onClick={handleLogout} className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-400">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="xl:hidden flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto">
          {navItems.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${activeTab === key ? 'bg-emerald-500/20 text-emerald-400' : key === 'admin' ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7">
        {activeTab === 'store' && (
          <section className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 sm:p-7 grid lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-4">
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight m-0">
                  Kho Tài Nguyên <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">MMO &amp; AI Tự Động 24/7</span>
                </h1>
                <p className="text-sm sm:text-base max-w-2xl m-0 text-[var(--text-secondary)]">
                  Via Facebook, Gmail Cổ, Tài khoản AI (ChatGPT, Claude, Cursor), Proxy sạch tốc độ cao. Thanh toán VietQR tự động, xuất kho ngay tức thì và bảo hành 1 đổi 1.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-mono">
                  {['VANHUNG10', 'MMO2026', 'NEWUSER50K'].map((code) => (
                    <button key={code} type="button" onClick={() => copyText(code)} className="px-3 py-1.5 rounded-lg surface-box text-emerald-400 font-bold">Mã: {code}</button>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl surface-box">
                  <div className="text-xs text-[var(--text-muted)]">Sản phẩm đang bán</div>
                  <div className="text-xl font-bold font-mono mt-1">{products.length}</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Kết nối DB thực</div>
                </div>
                <div className="p-4 rounded-xl surface-box">
                  <div className="text-xs text-[var(--text-muted)]">Tồn kho khả dụng</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">{products.reduce((s, p) => s + p.stock, 0).toLocaleString('vi-VN')}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">Chống bán âm</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const cnt = c.key === 'ALL' ? products.length : products.filter((p) => p.category === c.key).length;
                  return (
                    <button key={c.key} type="button" onClick={() => setActiveCat(c.key)} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${activeCat === c.key ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400' : 'surface-box text-[var(--text-muted)]'}`}>
                      {c.label} ({cnt})
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2.5">
                <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm sản phẩm..." className="input-field rounded-xl px-3.5 py-2 text-sm w-full sm:w-64" />
                <div className="flex surface-box rounded-xl p-1 shrink-0">
                  <button type="button" onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'table' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'}`}>Bảng Pro</button>
                  <button type="button" onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${viewMode === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-[var(--text-muted)]'}`}>Lưới Thẻ</button>
                </div>
              </div>
            </div>

            {!filteredProducts.length ? (
              <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
                <p className="text-sm text-[var(--text-muted)] m-0">Kho chưa có sản phẩm nào.</p>
                {isAdmin && (
                  <button type="button" onClick={() => setActiveTab('admin')} className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">
                    Vào Admin để đăng sản phẩm &amp; nạp kho thật →
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-[11px] uppercase font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                      <tr><th className="p-4">Sản phẩm</th><th className="p-4 text-center">QG</th><th className="p-4 text-center">Bảo hành</th><th className="p-4 text-center">Tồn kho</th><th className="p-4 text-right">Đơn giá</th><th className="p-4 text-right">Hành động</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[var(--surface-hover)]">
                          <td className="p-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              {p.badge && <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/15 text-emerald-400">{p.badge}</span>}
                              <span className="font-semibold">{p.name}</span>
                            </div>
                            <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">Format: {p.format_hint}</div>
                          </td>
                          <td className="p-4 text-center font-mono text-xs">{p.country}</td>
                          <td className="p-4 text-center"><span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 text-xs">{p.warranty}</span></td>
                          <td className={`p-4 text-center font-mono font-bold ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{p.stock}</td>
                          <td className="p-4 text-right font-mono font-bold">{fmtVnd(p.price)}</td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              disabled={p.stock === 0}
                              onClick={() => {
                                if (!user) { showToast('Vui lòng đăng nhập để mua hàng!', true); setAuthModal({ open: true, mode: 'login' }); return; }
                                setBuyProduct(p);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs disabled:opacity-40"
                            >
                              {p.stock > 0 ? 'Mua ngay' : 'Hết hàng'}
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
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded surface-box text-cyan-400">{p.category} · {p.country}</span>
                        {p.badge && <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{p.badge}</span>}
                      </div>
                      <h3 className="font-bold text-base mt-3 mb-0">{p.name}</h3>
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
                          if (!user) { showToast('Vui lòng đăng nhập để mua hàng!', true); setAuthModal({ open: true, mode: 'login' }); return; }
                          setBuyProduct(p);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs disabled:opacity-40"
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
          <DepositSection user={user} onCopy={copyText} onRefreshBalance={() => { loadSession(); showToast('Đã cập nhật số dư mới nhất từ máy chủ.'); }} />
        )}

        {activeTab === 'orders' && (
          <section className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold m-0">Đơn Hàng Đã Mua</h2>
              {!orders.length ? (
                <div className="glass-panel rounded-2xl p-8 text-center text-sm text-[var(--text-muted)]">Chưa có đơn hàng nào.</div>
              ) : (
                orders.map((o) => (
                  <article key={o.order_code} className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{o.order_code}</span>
                        <strong className="text-sm sm:text-base">{o.product_name}</strong>
                        {o.warranty_status && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">{o.warranty_status}</span>}
                      </div>
                      <div className="text-xs font-mono text-[var(--text-muted)] mt-1">SL: {o.quantity} · <strong className="text-emerald-400">{fmtVnd(o.total_amount)}</strong></div>
                    </div>
                    <button type="button" onClick={() => setActiveOrder(o)} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">Chi tiết đơn / Bảo hành</button>
                  </article>
                ))
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold m-0">Biến Động Số Dư</h3>
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="text-xs uppercase font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                      <tr><th className="p-3.5">Loại</th><th className="p-3.5">Số tiền</th><th className="p-3.5">Số dư sau</th><th className="p-3.5">Nội dung</th></tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {ledger.map((l) => (
                        <tr key={l.id}>
                          <td className="p-3.5"><span className={`text-[11px] font-bold px-2 py-0.5 rounded ${l.amount >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>{l.type}</span></td>
                          <td className={`p-3.5 font-mono font-bold ${l.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{l.amount >= 0 ? '+' : ''}{fmtVnd(l.amount)}</td>
                          <td className="p-3.5 font-mono">{fmtVnd(l.balance_after)}</td>
                          <td className="p-3.5 text-xs text-[var(--text-secondary)]">{l.description}</td>
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
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                <button type="button" onClick={() => setActiveTab('deposit')} className="mt-6 w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">Nạp tiền</button>
              </article>
            ))}
          </section>
        )}

        {activeTab === 'tools' && (
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold m-0">Công Cụ Lấy Mã 2FA Live</h2>
              <input value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} className="w-full input-field rounded-xl px-4 py-2.5 font-mono text-sm uppercase" />
              <div className="p-5 rounded-xl surface-box flex items-center justify-between">
                <div className="text-3xl font-mono font-extrabold text-emerald-400">{totpInfo.code}</div>
                <div className="text-xl font-mono font-bold text-cyan-400">{totpInfo.rem}s</div>
              </div>
              <button type="button" onClick={() => copyText(totpInfo.code.replace(/\s/g, ''))} className="w-full py-2.5 rounded-xl surface-box text-sm font-semibold">Sao chép mã 2FA</button>
            </div>
            <div className="glass-panel rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold m-0">API Mua Hàng (Row-Level Locking)</h2>
                <div className="flex gap-1.5">
                  {(['curl', 'node', 'sql'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setApiLang(l)} className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold ${apiLang === l ? 'bg-indigo-500 text-white' : 'surface-box text-[var(--text-muted)]'}`}>{l.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <pre className="rounded-xl p-4 text-xs font-mono overflow-x-auto bg-[#04070E] text-emerald-300 border border-[var(--border-subtle)] m-0">{API_SNIPPETS[apiLang]}</pre>
            </div>
          </section>
        )}

        {/* REAL PRODUCTION ADMIN PANEL */}
        {activeTab === 'admin' && isAdmin && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold m-0">Admin Dashboard (Neon PostgreSQL Live)</h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Doanh thu thực</div><div className="text-2xl font-mono font-bold text-emerald-400 mt-1">{fmtVnd(adminStats.revenue)}</div></div>
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Tổng đơn</div><div className="text-2xl font-mono font-bold text-cyan-400 mt-1">{adminStats.totalOrders}</div></div>
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Người dùng</div><div className="text-2xl font-mono font-bold mt-1">{adminStats.users.length}</div></div>
              <div className="glass-panel rounded-xl p-5"><div className="text-xs text-[var(--text-muted)]">Bảo hành</div><div className="text-2xl font-mono font-bold text-amber-400 mt-1">{adminStats.warranties.length}</div></div>
            </div>

            {/* 1. Create Product */}
            <form
              className="glass-panel rounded-2xl p-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: admName, category: admCat, price: Number(admPrice), warranty: admWarranty }),
                });
                if (res.ok) {
                  setAdmName(''); setAdmPrice('');
                  await loadProducts();
                  showToast('Đã tạo sản phẩm mới trên Neon Database!');
                } else {
                  showToast('Lỗi tạo sản phẩm.', true);
                }
              }}
            >
              <h3 className="font-bold text-lg m-0">1. Tạo Sản Phẩm Mới</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input value={admName} onChange={(e) => setAdmName(e.target.value)} placeholder="Tên sản phẩm..." required className="lg:col-span-2 input-field rounded-xl px-3.5 py-2.5 text-sm" />
                <select value={admCat} onChange={(e) => setAdmCat(e.target.value as ProductCategory)} className="input-field rounded-xl px-3.5 py-2.5 text-sm">
                  <option value="AI">Tài khoản AI</option><option value="FB">Via &amp; Clone FB</option><option value="MAIL">Gmail &amp; Mail Cổ</option><option value="PROXY">Proxy &amp; VPS</option>
                </select>
                <input type="number" value={admPrice} onChange={(e) => setAdmPrice(e.target.value)} placeholder="Giá (VNĐ)" required className="input-field rounded-xl px-3.5 py-2.5 text-sm" />
                <input value={admWarranty} onChange={(e) => setAdmWarranty(e.target.value)} placeholder="Bảo hành" className="input-field rounded-xl px-3.5 py-2.5 text-sm" />
              </div>
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm">+ Tạo sản phẩm</button>
            </form>

            {/* 2. Bulk Upload Real Stock Items */}
            <form
              className="glass-panel rounded-2xl p-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await fetch('/api/admin/stock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ productId: stockProdId, lines: stockLines }),
                });
                const data = await res.json();
                if (res.ok) {
                  setStockLines('');
                  await loadProducts();
                  showToast(`Đã nạp thật ${data.inserted} tài khoản vào kho Neon!`);
                } else {
                  showToast(data.error || 'Lỗi nạp kho.', true);
                }
              }}
            >
              <h3 className="font-bold text-lg m-0">2. Nạp Kho Tài Nguyên Thật (Mỗi dòng 1 tài khoản / key)</h3>
              <select value={stockProdId} onChange={(e) => setStockProdId(Number(e.target.value))} className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm">
                <option value={0}>-- Chọn sản phẩm cần nạp kho --</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} (Hiện có: {p.stock})</option>)}
              </select>
              <textarea
                rows={4}
                required
                value={stockLines}
                onChange={(e) => setStockLines(e.target.value)}
                placeholder={'email1@domain.com|pass1|2fa1\nemail2@domain.com|pass2|2fa2'}
                className="w-full input-field rounded-xl p-3 font-mono text-xs"
              />
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">+ Nạp vào bảng stock_items</button>
            </form>

            {/* 3. Customer Wallet Management */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="p-4 font-bold text-sm border-b border-[var(--border-subtle)]">3. Quản Lý Khách Hàng &amp; Cộng/Trừ Ví Thực</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-xs uppercase font-mono bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                    <tr><th className="p-3.5">ID</th><th className="p-3.5">Tài khoản</th><th className="p-3.5">Quyền</th><th className="p-3.5">Số dư</th><th className="p-3.5 text-right">Điều chỉnh</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {adminStats.users.map((u) => (
                      <tr key={u.id}>
                        <td className="p-3.5 font-mono text-xs text-cyan-400">VH {u.id}</td>
                        <td className="p-3.5"><div className="font-semibold">{u.username}</div><div className="text-xs text-[var(--text-muted)]">{u.email}</div></td>
                        <td className="p-3.5 font-mono text-xs font-bold">{u.role}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">{fmtVnd(u.balance)}</td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          <button type="button" onClick={async () => { await fetch('/api/admin/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, delta: 500000 }) }); loadAdminOverview(); loadSession(); showToast(`Đã cộng +500K cho VH ${u.id}`); }} className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold">+500K</button>
                          <button type="button" onClick={async () => { await fetch('/api/admin/wallet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, delta: -100000 }) }); loadAdminOverview(); loadSession(); showToast(`Đã trừ -100K của VH ${u.id}`); }} className="px-3 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold">-100K</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Warranty Tickets */}
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-sm m-0">4. Yêu Cầu Bảo Hành Từ Khách</h3>
              {!adminStats.warranties.length ? (
                <p className="text-xs text-[var(--text-muted)] m-0">Chưa có ticket bảo hành.</p>
              ) : (
                adminStats.warranties.map((t) => (
                  <div key={t.id} className="surface-box rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <strong>#{t.id}</strong> · Đơn <span className="font-mono">{t.order_code}</span> ({t.username}): &ldquo;{t.reason}&rdquo; — <strong className="text-amber-400">{t.status}</strong>
                    </div>
                    <button type="button" onClick={async () => { await fetch('/api/admin/warranty', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: t.id }) }); loadAdminOverview(); showToast(`Đã duyệt bảo hành #${t.id}`); }} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold">
                      Duyệt đổi mới
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="py-6 text-center text-xs border-t border-[var(--border-subtle)] text-[var(--text-muted)]">
        &copy; 2026 <strong>VANHUNG.XYZ</strong> — VANHUNG Digital Store.
      </footer>

      <AuthModal
        open={authModal.open}
        initialMode={authModal.mode}
        onClose={() => setAuthModal((p) => ({ ...p, open: false }))}
        onSuccess={(msg) => { loadSession(); showToast(msg); }}
        onError={(msg) => showToast(msg, true)}
      />

      <QuickBuyModal
        product={buyProduct}
        user={user}
        onClose={() => setBuyProduct(null)}
        onGoDeposit={() => setActiveTab('deposit')}
        onPurchased={(order) => {
          setBuyProduct(null);
          setActiveOrder(order);
          loadProducts();
          loadSession();
          showToast('Mua thành công! Đã trừ ví và xuất kho thật từ Neon Database.');
        }}
        onError={(msg) => showToast(msg, true)}
      />

      <OrderDetailModal
        order={activeOrder}
        onClose={() => setActiveOrder(null)}
        onCopy={copyText}
        onWarrantySubmitted={() => { loadSession(); showToast('Đã gửi yêu cầu bảo hành lên hệ thống!'); }}
        onError={(msg) => showToast(msg, true)}
      />

      {toastMsg && (
        <div role="status" className={`fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl font-bold text-sm shadow-2xl ${toastMsg.isError ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'}`}>
          {toastMsg.text}
        </div>
      )}
    </div>
  );
}
