# Đưa ShopNest lên mạng (bạn chỉ việc upload)

Code **đã sẵn sàng**. Không sửa file, không chạy lệnh trên máy.

Bạn chỉ làm trên trình duyệt:

1. Tải / giải nén thư mục ShopNest
2. Đưa thư mục đó lên **GitHub**
3. Tạo database **Neon** (copy 2 đường dẫn)
4. Bấm Deploy trên **Vercel** (dán vài dòng) → có tên miền miễn phí

Thời gian khoảng 20 phút. Không cần thẻ tín dụng.

Ghi ra giấy 3 thứ bạn sẽ tự đặt:

```text
Tài khoản admin:     admin
Mật khẩu admin:      ................ (tự đặt, nhớ kỹ)
Email của bạn:       ................
```

---

# BƯỚC 1 — Tải code và giải nén

1. Tải file `ShopNest.zip` (hoặc tải cả thư mục `shopnest` từ workspace).
2. Giải nén ra Desktop, ví dụ:

```text
C:\Users\Bạn\Desktop\ShopNest
```

3. Mở thư mục, **phải thấy** các file/thư mục:

```text
DOC-TOI-TRUOC.txt
HUONG-DAN-LEN-MANG.md
package.json
prisma
public
src
vercel.json
```

**Không** cần cài Node.js, không cần `npm install`.

---

# BƯỚC 2 — Tạo tài khoản GitHub

1. Mở Chrome / Edge, vào: https://github.com/signup
2. Nhập email → Continue
3. Tạo mật khẩu GitHub (khác mật khẩu ShopNest) → Continue
4. Đặt username GitHub, ví dụ `nguyenvana`
5. Làm quiz robot nếu có
6. Mở email, bấm xác nhận GitHub
7. Đăng nhập lại https://github.com cho chắc

Giữ tab GitHub mở.

---

# BƯỚC 3 — Đưa code lên GitHub

Làm **một trong hai cách**. Cách A dễ hơn nếu bạn dùng Windows.

## Cách A — GitHub Desktop (khuyến nghị)

### A1. Cài GitHub Desktop

1. Vào https://desktop.github.com
2. Bấm **Download for Windows** (hoặc Mac)
3. Cài đặt, mở **GitHub Desktop**
4. Bấm **Sign in to GitHub.com**
5. Cho phép trình duyệt đăng nhập, quay lại GitHub Desktop

### A2. Tạo repository từ thư mục ShopNest

1. GitHub Desktop: **File → New repository…**
2. Điền:
   - **Name:** `shopnest`
   - **Local path:** bấm **Choose…** → chọn **thư mục CHA** của ShopNest  
     Ví dụ ShopNest nằm ở `Desktop\ShopNest` thì Local path là `Desktop`  
     (GitHub Desktop sẽ tạo `Desktop\shopnest` — dễ trùng tên)
   - **Cách chắc ăn:**  
     - Name: `shopnest`  
     - Local path: `C:\Users\Bạn\Desktop`  
     - Nếu báo thư mục đã tồn tại: chọn **File → Add local repository** → trỏ vào `Desktop\ShopNest`
3. Nếu dùng **Add local repository**:
   - Path = `C:\Users\Bạn\Desktop\ShopNest`
   - Nếu hiện “This directory does not appear to be a Git repository” → bấm **create a repository**
   - Name: `shopnest`
   - **Không** tick “Keep this code private” nếu không thấy; lúc Publish sẽ chọn Private
4. Description để trống
5. Git ignore: **None** (project đã có `.gitignore`)
6. License: **None**
7. Bấm **Create repository**

### A3. Gửi lên GitHub.com

1. GitHub Desktop hiện cửa sổ, góc trên có **Publish repository**
2. Bấm **Publish repository**
3. **Bật** Keep this code private (nếu muốn chỉ mình bạn thấy code)
4. Bấm **Publish repository** lần nữa
5. Đợi xong. Vào https://github.com → phải thấy repo **shopnest** với các thư mục `src`, `prisma`, `public`

Xong Bước 3. Sang Bước 4.

## Cách B — Kéo thả trên github.com (không cài phần mềm)

GitHub giới hạn số file kéo thả. Thư mục `node_modules` **không được** có trong bản bạn tải (zip chuẩn đã loại). Nếu vẫn lỗi, dùng Cách A.

1. https://github.com → dấu **+** góc phải → **New repository**
2. Repository name: `shopnest`
3. Chọn **Private**
4. **Không** tick Add README
5. Bấm **Create repository**
6. Bấm dòng **uploading an existing file**
7. Mở Explorer, vào thư mục ShopNest
8. `Ctrl + A` chọn tất cả → kéo vào trang GitHub
9. **Bỏ chọn** nếu lỡ có: `node_modules`, `.next`, `.env`
10. Commit message: `ShopNest`
11. Bấm **Commit changes**
12. Đợi upload xong, F5. Phải thấy `package.json`, `src`, `prisma`

---

# BƯỚC 4 — Tạo database Neon (miễn phí)

1. Mở tab mới: https://neon.tech
2. Bấm **Sign up**
3. Chọn **Continue with GitHub**
4. Bấm **Authorize** / Allow
5. Nếu hỏi Onboarding:
   - Project name: `shopnest`
   - Database name: để `neondb` (mặc định)
   - Region: chọn **Singapore** / `Asia Pacific (Singapore)` nếu có. Không có thì để mặc định
6. Bấm **Create project** / **Continue**

## Copy 2 đường dẫn kết nối

Neon có nút **Connect** (hoặc hiện Connection string ngay sau khi tạo).

### 4.1. DATABASE_URL (bản Pooled)

1. Trong hộp Connect, tìm ô **Connection string**
2. Chọn:
   - Branch: `production` hoặc `main`
   - Database: `neondb`
   - Role: mặc định
3. Bật **Pooled connection** (ON) — host sẽ có chữ `-pooler`
4. Copy cả dòng bắt đầu bằng `postgresql://`
5. Dán vào Notepad, ghi chú: `DATABASE_URL = ...`

Ví dụ (bạn sẽ khác):

```text
postgresql://neondb_owner:xxxx@ep-abc-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

### 4.2. DIRECT_URL (bản Direct)

1. **Tắt** Pooled connection (OFF) — host **không** còn chữ `pooler`
2. Copy dòng `postgresql://` mới
3. Dán Notepad, ghi chú: `DIRECT_URL = ...`

Ví dụ:

```text
postgresql://neondb_owner:xxxx@ep-abc.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

Hai dòng **khác nhau** ở chỗ có / không có `-pooler`.  
Nếu Neon có sẵn tab **Prisma**, lấy đúng 2 biến `DATABASE_URL` và `DIRECT_URL` trên đó.

**Cấm** gửi 2 dòng này cho ai, cấm up lên GitHub.

---

# BƯỚC 5 — Tạo SESSION_SECRET

Mở Notepad, gõ một chuỗi dài hỗn hợp (ít nhất 32 ký tự), ví dụ tự bịa:

```text
shopnest-ban-2026-xK9mP2qL7wN4jR8sT1vB6cD3
```

Ghi chú: `SESSION_SECRET = ...`

Đừng dùng đúng ví dụ trên. Tự đổi số/chữ.

---

# BƯỚC 6 — Tạo website trên Vercel + tên miền miễn phí

1. Tab mới: https://vercel.com/signup
2. **Continue with GitHub**
3. **Authorize Vercel**
4. Vào Dashboard: https://vercel.com/dashboard
5. Bấm **Add New…** → **Project**
6. Mục Import Git Repository, tìm `shopnest`
7. Nếu không thấy: bấm **Adjust GitHub App Permissions** → tick repo `shopnest` → Save → quay lại Vercel, F5
8. Bấm **Import**

## 6.1. Dán biến môi trường (QUAN TRỌNG)

Ở màn hình Configure Project, **đừng bấm Deploy vội**.

Kéo tới **Environment Variables**. Thêm **từng dòng** (Key rồi Value rồi Add):

| Key | Value dán vào | Ghi chú |
|---|---|---|
| `DATABASE_URL` | dòng **Pooled** (có `pooler`) từ Neon | 1 dòng, không xuống hàng |
| `DIRECT_URL` | dòng **Direct** (không `pooler`) từ Neon | 1 dòng |
| `SESSION_SECRET` | chuỗi bước 5 | |
| `COOKIE_SECURE` | `true` | gõ đúng chữ true |
| `ADMIN_USERNAME` | `admin` | |
| `ADMIN_PASSWORD` | mật khẩu bạn đã ghi ra giấy | nhớ kỹ, khó đổi |
| `ADMIN_EMAIL` | email của bạn | |
| `NEXT_PUBLIC_SITE_URL` | `https://placeholder.vercel.app` | lát nữa sửa |

Cách thêm:

1. Ô **Key** gõ `DATABASE_URL`
2. Ô **Value** dán chuỗi Neon
3. Để Environment: **Production**, **Preview**, **Development** đều tick (mặc định)
4. Bấm **Add**
5. Lặp lại cho đủ 8 dòng

Kiểm tra đã có đủ 8 Key.

## 6.2. Cấu hình build

- Framework Preset: **Next.js** (tự nhận)
- Root Directory: để trống
- Build Command: để mặc định (project đã có `vercel.json`)
- **Không** sửa Output Directory

## 6.3. Deploy

1. Bấm **Deploy**
2. Đợi vòng tròn chạy 1–3 phút
3. Thấy **Congratulations** / ảnh preview là thành công

Nếu **Error** đỏ: kéo xuống **Lỗi thường gặp** cuối file này. Sửa xong vào tab Deployments → Redeploy.

---

# BƯỚC 7 — Lấy tên miền miễn phí và sửa URL

1. Trong project Vercel, bấm tab **Domains**  
   hoặc từ màn Success bấm **Continue to Dashboard**
2. Bạn sẽ thấy tên sẵn có, dạng:

```text
shopnest-xxxx.vercel.app
```

3. Bấm vào tên đó, copy. Website của bạn là:

```text
https://shopnest-xxxx.vercel.app
```

### Đổi tên cho dễ nhớ (không bắt buộc)

1. **Settings → Domains**
2. Bấm **Edit** trên `*.vercel.app`
3. Đặt tên còn trống, chỉ chữ thường / số / gạch ngang, ví dụ:
   - `thu-vien-cua-toi.vercel.app`
   - `wishlist-nha.vercel.app`
4. Save. Nếu “already taken”, thêm số: `wishlist-nha2.vercel.app`

### Cập nhật NEXT_PUBLIC_SITE_URL

1. **Settings → Environment Variables**
2. Tìm `NEXT_PUBLIC_SITE_URL` → **Edit**
3. Đổi thành đúng địa chỉ thật, ví dụ:

```text
https://thu-vien-cua-toi.vercel.app
```

Không có dấu `/` ở cuối.

4. Save
5. Vào tab **Deployments**
6. Bản mới nhất → nút **⋯** → **Redeploy**
7. Bỏ tick “Use existing Build Cache” nếu có
8. **Redeploy** → đợi xong

---

# BƯỚC 8 — Mở web và đăng nhập Admin

1. Mở trình duyệt, dán:

```text
https://TEN-BAN.vercel.app
```

Phải thấy ShopNest nền be, danh mục, sản phẩm demo.

2. Vào trang quản trị:

```text
https://TEN-BAN.vercel.app/admin/login
```

3. Tài khoản: `admin`  
   Mật khẩu: đúng `ADMIN_PASSWORD` lúc dán Vercel
4. Vào **Sản phẩm**:
   - Xóa sản phẩm ghi Demo nếu không cần
   - **Thêm sản phẩm** → dán link Shopee/Lazada/… → **Lấy thông tin** → chọn danh mục → **Lưu**
5. Về trang chủ, F5, thấy sản phẩm mới
6. **Mua ngay** sẽ mở đúng link bạn lưu (kể cả link affiliate)

Gửi `https://TEN-BAN.vercel.app` cho người khác. Họ **chỉ xem và bấm Mua ngay**, không vào được Admin.

---

# Dùng hằng ngày

| Việc | Link |
|---|---|
| Xem thư viện | `https://TEN-BAN.vercel.app` |
| Thêm/sửa sản phẩm | `https://TEN-BAN.vercel.app/admin/login` |
| Danh mục | Admin → Danh mục |
| Đổi tên shop, màu | Admin → Cài đặt / Giao diện |

Lần mở đầu tiên trong ngày có thể chậm 1–2 giây (database Neon đang ngủ). Bình thường.

---

# Lỗi thường gặp

## Vercel không thấy repo GitHub

**Adjust GitHub App Permissions** → chọn Only select repositories → tick `shopnest` → Save.

## Deploy đỏ: `Can't reach database` / `P1001`

Copy sai URL Neon, hoặc lẫn pooled/direct. Vào Neon → Connect → copy lại 2 dòng, sửa Environment Variables, Redeploy.

## Deploy đỏ: `Environment variable not found: DIRECT_URL`

Thiếu biến. Thêm đủ 8 Key, Redeploy.

## Deploy đỏ: `sqlite` / `file:./dev.db`

Bạn đang dùng bản code cũ. Bản zip này đã là Postgres. Tải lại zip mới, push đè lên GitHub.

## Vào web được nhưng `/admin/login` báo sai mật khẩu

Mật khẩu Admin **không đổi** khi bạn sửa `ADMIN_PASSWORD` trên Vercel sau lần deploy đầu (đã seed rồi).

Cách reset:

1. Neon dashboard → project `shopnest` → **SQL Editor**
2. Chạy:

```sql
DELETE FROM "AdminUser";
```

3. Vercel → Environment Variables: sửa `ADMIN_PASSWORD` nếu muốn
4. Deployments → Redeploy (seed sẽ tạo admin mới)

## Đăng nhập xong lại về trang login

Thiếu `COOKIE_SECURE=true`. Thêm / sửa thành `true`, Redeploy.

## Trang 500

Vercel → Deployments → bản lỗi → **Runtime Logs**. Thường thiếu `SESSION_SECRET` hoặc DB.

## “Lấy thông tin” không ra ảnh/tên

Sàn chặn bot. Không phải lỗi site. Nhập tay tên + URL ảnh rồi Lưu.

---

# Bạn không cần làm

- Không mua tên miền `.com` (trừ khi muốn)
- Không dùng Freenom / `.tk`
- Không chạy `npm` trên máy
- Không sửa `schema.prisma`
- Không up file `.env` lên GitHub

---

# Tóm tắt

```text
Zip ShopNest
   → GitHub (Desktop hoặc kéo thả)
   → Neon (copy 2 URL)
   → Vercel Import + dán 8 biến + Deploy
   → https://ten-ban.vercel.app
   → /admin/login
```
