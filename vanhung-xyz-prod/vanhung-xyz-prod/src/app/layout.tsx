import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin', 'vietnamese'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'VANHUNG.XYZ — Hệ Sinh Thái Tài Nguyên MMO & AI Tự Động 24/7',
  description: 'Kho tài nguyên MMO & AI tự động 24/7: Via Facebook, Gmail Cổ, Tài khoản AI, Proxy sạch. Nạp VietQR SePay Auto 3s.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="dark" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
