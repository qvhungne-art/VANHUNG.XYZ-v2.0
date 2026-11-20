# VANHUNG.XYZ v3.0 PRODUCTION (Next.js + Neon PostgreSQL + Vercel)

Phiên bản vận hành bán hàng thật 100%, không dùng `localStorage` cho ví/tài khoản và đã gỡ bỏ toàn bộ nút nạp tiền mô phỏng:
- **Đăng ký / Đăng nhập bảo mật trên Server:** Mã hóa mật khẩu `scrypt` + cookie `HttpOnly` ký HMAC-SHA256. **Tài khoản đầu tiên đăng ký trên web sẽ tự động được cấp quyền `ADMIN`** (không lưu mật khẩu cứng trong mã nguồn).
- **Kho hàng & Giao dịch Neon PostgreSQL:** Toàn bộ sản phẩm, tồn kho `stock_items`, đơn hàng, biến động số dư và bảo hành lưu 100% trên Neon Database với Row-Level Locking (`FOR UPDATE` + `FOR UPDATE SKIP LOCKED`).
- **Admin Nạp Kho Thật:** Vào tab **Admin** để tạo sản phẩm, dán danh sách tài khoản/key thật (mỗi dòng 1 item), cộng/trừ ví khách và duyệt bảo hành.
- **Tự động nạp tiền SePay:** Trỏ Webhook SePay về `https://vanhung.xyz/api/webhooks/sepay` kèm biến môi trường `SEPAY_API_KEY` trên Vercel.
