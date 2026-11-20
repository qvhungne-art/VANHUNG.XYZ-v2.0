# VANHUNG.XYZ — Next.js 14 Full-Stack Digital Store (GitHub + Vercel)

Mã nguồn **Next.js App Router + React + TypeScript + Tailwind CSS** hoàn chỉnh (không dùng file `index.html`), tích hợp sẵn Route Handlers API với **PostgreSQL Transaction & Row-Level Locking**.

## Cấu trúc thư mục

```text
vanhung-xyz-nextjs/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── public/logo.svg
├── sql/schema.sql
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── page.tsx
    │   └── api/
    │       ├── coupons/validate/route.ts
    │       ├── orders/purchase/route.ts
    │       └── webhooks/sepay/route.ts
    ├── lib/
    │   ├── types.ts
    │   ├── data.ts
    │   └── db.ts
    └── components/
        ├── StoreApp.tsx
        ├── AuthModal.tsx
        ├── QuickBuyModal.tsx
        ├── OrderDetailModal.tsx
        └── DepositSection.tsx
```

## Deploy lên Vercel từ GitHub

1. Xóa các file cũ trong repo GitHub (nếu trước đó là bản Vite) và tải toàn bộ file bên trong `vanhung-xyz-nextjs/` lên nhánh `main`.
2. Trên Vercel vào **Settings → General → Framework Preset**, đổi sang **Next.js** (hoặc tạo Project mới để Vercel tự nhận diện Next.js).
3. Bấm **Redeploy** — website sẽ tự chạy trên `https://vanhung.xyz`.
4. (Tùy chọn nối DB thật) Chạy `sql/schema.sql` trên Neon/Supabase PostgreSQL và thêm `DATABASE_URL`, `SEPAY_API_KEY` vào **Vercel → Environment Variables**.
