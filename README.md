# ShopNest

**Muốn lên mạng với tên miền miễn phí?** Không cần sửa code. Đọc:

1. `DOC-TOI-TRUOC.txt`
2. `HUONG-DAN-LEN-MANG.md`

Tải file `ShopNest.zip` (đã loại `node_modules`), giải nén, rồi chỉ việc upload GitHub → Neon → Vercel.

---

# ShopNest (dành cho lập trình viên)

Thư viện sản phẩm cá nhân thông minh (**Smart Personal Product Library / Wishlist**).

Đây **không phải** website thương mại điện tử. Người xem chỉ có thể:

1. Xem sản phẩm và danh mục
2. Nhấn **Mua ngay** để mở URL đã lưu

Admin dán link → hệ thống tự lấy tên + ảnh → chọn danh mục → lưu. Link affiliate được giữ nguyên làm URL mua hàng.

Giao diện mặc định lấy cảm hứng từ phong cách ShopNest ấm (be / nâu), tối giản.

## Công nghệ

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Prisma + SQLite (chạy độc lập, không cần dịch vụ ngoài)
- Cookie session JWT (`jose`) + bcrypt
- Cheerio để trích metadata (Open Graph / Twitter / JSON-LD / title / h1)

**Vì sao không dùng Supabase mặc định?** ShopNest cần chạy production-ready ngay trên máy local/Vercel mà không phụ thuộc khóa dịch vụ bên thứ ba. SQLite + Prisma đáp ứng đủ CRUD, dễ sao lưu file `.db`, và có thể đổi sang PostgreSQL sau bằng cách đổi `provider` trong `prisma/schema.prisma`.

## 1. Cài dependencies

```bash
npm install
```

## 2. Cấu hình environment

```bash
cp .env.example .env
```

Sửa `SESSION_SECRET` thành chuỗi ngẫu nhiên dài (≥ 32 ký tự) trước khi deploy.

```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="..."
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="ChangeMe_Admin_123"
ADMIN_EMAIL="admin@shopnest.local"
COOKIE_SECURE="false"
```

Trên HTTPS (Vercel) đặt `COOKIE_SECURE="true"`.

## 3. Tạo database + Admin

```bash
npm run db:setup
```

Lệnh này:

- `prisma generate`
- `prisma db push`
- seed admin + danh mục + sản phẩm demo (`isDemo=true`, có thể xóa trong Admin)

Mặc định local (nếu không đổi `.env`):

- Username: `admin`
- Password: `Admin@12345`

## 4. Chạy local

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000)

Admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## 5. Test

```bash
npm test
```

Kiểm tra URL validation, loại link, giữ affiliate, metadata parser, SSRF hostname, slug, adapter.

## 6. Build production

```bash
npm run build
npm start
```

## 7. Đưa lên mạng (tên miền miễn phí)

Hướng dẫn từng nút bấm (tiếng Việt): **[HUONG-DAN-LEN-MANG.md](./HUONG-DAN-LEN-MANG.md)**

Tóm tắt: GitHub + Neon (database) + Vercel → có ngay `https://ten-ban.vercel.app`.

## Luồng Admin

1. Đăng nhập `/admin/login`
2. **Thêm sản phẩm** → dán URL → Lấy thông tin → chọn danh mục → Lưu
3. **Nhập hàng loạt** → mỗi URL một dòng → xử lý (3 URL/lần) → review → Lưu tất cả
4. Quản lý danh mục, giao diện, cài đặt

Nếu không lấy được metadata: không fake data. Admin nhập tay tên + ảnh rồi lưu.

## Bảo mật

- Mật khẩu hash bcrypt
- Session httpOnly, SameSite=Lax
- Rate limit đăng nhập và extract
- SSRF: chặn localhost / IP nội bộ / metadata endpoint
- Timeout + giới hạn kích thước HTML
- Authorization phía server cho mọi API admin
- Public API chỉ đọc sản phẩm/danh mục/settings công khai

## Cấu trúc

```
src/
  app/            pages + API routes
  components/     UI public & admin
  lib/
    auth.ts
    db.ts
    url/          resolver, normalize, SSRF
    extract/      metadata + platform adapters
prisma/
  schema.prisma
  seed.ts
```

## Ghi chú

- Sản phẩm demo được đánh dấu `isDemo` và dùng URL `example.com`. Có thể xóa trong Admin.
- Không vượt qua CAPTCHA / anti-bot của sàn. Nếu nền tảng chặn, hãy nhập thủ công.
- Desktop: lưới **5 cột**. Mobile: **2 cột**.
