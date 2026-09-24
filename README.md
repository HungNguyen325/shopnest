# ContentFlow AI

SaaS quản lý nội dung cho KOC/KOL/affiliate/creator/chủ shop: **lưu sản phẩm → tạo nội dung bằng AI → chỉnh sửa → sao chép → lên lịch → xác nhận đã đăng → theo dõi trạng thái và hiệu quả.**

Giao diện tiếng Việt, chạy được ngay không cần API key AI (có engine nội bộ làm dự phòng).

---

## 1. Chạy nhanh

```bash
cd contentflow
npm install
npm run db:push      # tạo bảng trong prisma/dev.db (SQLite)
npm run db:seed      # tạo tài khoản demo + dữ liệu mẫu
npm run dev          # http://localhost:3000
```

Đăng nhập demo:

| Email | Mật khẩu |
| --- | --- |
| `demo@contentflow.ai` | `demo1234` |

Tài khoản đầu tiên đăng ký trong hệ thống sẽ có quyền `admin` (vào được **AI Settings**).

Lệnh khác:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm test            # vitest (unit test logic AI/validate/http)
npm run test:browser  # Playwright: tải mọi trang + responsive + lỗi console
npm run test:flows    # Playwright: 14 luồng thao tác thật trên UI
npm run test:overflow # tìm phần tử gây tràn ngang ở một bề rộng
npm run build       # next build (production)
npm start           # chạy bản production
npm run db:reset    # xóa dev.db rồi push + seed lại
```

> `npm run build` cần khoảng 1.5 GB RAM trống. Trên máy ít RAM hãy tắt dev server trước khi build.

---

## 2. Cấu hình môi trường

Sao chép `.env.example` thành `.env`. Không có key nào thì hệ thống vẫn chạy bằng engine nội bộ.

```env
DATABASE_URL="file:./dev.db"
APP_URL="http://localhost:3000"
SESSION_SECRET="<chuỗi ngẫu nhiên dài>"
SESSION_COOKIE_NAME="cf_session"
SESSION_DAYS="30"

# AI — provider chính; key để trống thì hệ thống rơi về engine nội bộ
AI_PROVIDER="groq"
GROQ_API_KEY=""
GROQ_MODEL="openai/gpt-oss-120b"
GROQ_FALLBACK_MODEL="llama-3.3-70b-versatile"
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash-lite"
GEMINI_FALLBACK_MODEL="gemini-2.0-flash"
OPENROUTER_API_KEY=""
OPENROUTER_MODEL=""

AI_TEMPERATURE="0.7"
AI_MAX_TOKENS="2000"
AI_TIMEOUT_MS="30000"
AI_MAX_RETRIES="2"
AI_DAILY_LIMIT_PER_USER="20"
AI_PER_MINUTE_LIMIT_PER_USER="5"
AI_REGENERATE_LIMIT_PER_MINUTE="2"
AI_MAX_INPUT_CHARS="12000"
AI_CACHE_TTL_MINUTES="60"

# Ảnh: UPLOAD_MAX_MB chặn ở server, NEXT_PUBLIC_* cho bước nén ở trình duyệt
UPLOAD_MAX_MB="5"
NEXT_PUBLIC_UPLOAD_MAX_MB="5"
UPLOAD_MAX_DIMENSION="1400"
NEXT_PUBLIC_UPLOAD_MAX_DIMENSION="1400"

SEED_DEMO_EMAIL="demo@contentflow.ai"
SEED_DEMO_PASSWORD="demo1234"
```

Provider, model (chính + dự phòng), nhiệt độ, `maxTokens`, hạn mức theo ngày/phút và cả khóa API đều đổi được trong **AI Settings** (admin) mà không cần sửa `.env`: lần chạy đầu các giá trị `.env` được nạp vào bảng `AIConfig`, sau đó bản trong DB thắng. Riêng `AI_TIMEOUT_MS` và `AI_MAX_RETRIES` chỉ đọc từ `.env`.

**Không commit `.env`** (đã nằm trong `.gitignore`). Khóa AI chỉ được đọc ở phía máy chủ; API chỉ trả về trạng thái đã cấu hình và bản che (`gsk••••cdef`).

### Đổi sang PostgreSQL / MySQL

Sửa `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"        // hoặc "mysql"
  url      = env("DATABASE_URL")
}
```

rồi `npm run db:push`. Code ứng dụng dùng Prisma Client nên không cần sửa gì thêm; riêng `PlanSlot.product` đang dùng `onDelete: SetNull` — giữ nguyên để xóa sản phẩm không làm mất bài đã đăng.

---

## 3. Kiến trúc

```
app/
  (auth)/        login, register, forgot-password, reset-password
  (app)/         dashboard, products, products/[id], create, posts,
                 calendar, ideas, templates, analytics, settings, settings/ai
  api/           auth, products, posts, ai, plans, templates, analytics, account, dashboard
  page.tsx       landing page
  preview/       trang preview tính năng trong app (đọc public/shots/pack.json)
proxy.ts         guard cookie (Next 16 "proxy", thay cho middleware)
components/      ui.tsx (toàn bộ ui kit), app-shell.tsx (shell + sidebar + search),
                 product-form.tsx, auth/, preview/, providers.tsx
lib/
  ai.ts          system-prompt, content-engine (engine nội bộ), providers
                 (groq/gemini/openrouter/mock), retry, cache, quota, usage,
                 ai-provider-factory, ai-response-parser, http — gộp 1 file
  auth.ts        bcrypt + session cookie (httpOnly, Partitioned) tự viết
  validations.ts zod schema dùng chung client/server
prisma/          schema.prisma (17 model), seed.mjs (dev.db tạo bằng db:reset)
tests/           app.test.ts — 48 unit test (engine, parser, validations, utils, http)
public/shots/    pack.json — 40 ảnh chụp thật của app (base64, 1 file duy nhất)
preview/         feature-gallery.html — gallery offline tự chứa
scripts/         tools.mjs — smoke | flows | capture | shots | overflow
```

**Chuỗi thử AI:** provider chính → model dự phòng cùng provider → provider dự phòng → provider khác đã cấu hình → engine nội bộ. Mọi phản hồi đều kèm `meta.providerLabel`, `meta.model`, `meta.isFallbackEngine` để người dùng biết nội dung do ai viết.

**Trạng thái bài đăng:** `draft → planned → ready → published`, cộng `failed` và `archived`. Hệ thống **không bao giờ tự đánh dấu đã đăng** — luôn là thao tác xác nhận thủ công (chưa tích hợp API mạng xã hội chính thức).

---

## 4. Nguyên tắc nội dung AI

- Chỉ dùng dữ liệu có trong kho sản phẩm. Không bịa giá, khuyến mãi, chứng nhận, thông số, trải nghiệm cá nhân.
- Thiếu trải nghiệm thật → nội dung viết ở góc độ thông tin và khai báo rõ "mình chưa dùng lâu dài", đồng thời liệt kê trong `missing_information`.
- Thiếu link affiliate → CTA để hướng dẫn chung, không tự sinh link.
- Nhóm sức khỏe/sắc đẹp/thực phẩm → luôn kèm ghi chú "kết quả có thể khác nhau", không khẳng định tuyệt đối.
- Từ khóa cấm trong hồ sơ thương hiệu được lọc khỏi hashtag và nội dung.
- Không cam kết thu nhập hay hiệu quả bán hàng ở bất kỳ đâu trong sản phẩm.

---

## 5. Kiểm thử

| Lệnh | Kết quả |
| --- | --- |
| `npm run typecheck` | pass, 0 lỗi |
| `npm run lint` | pass, 0 lỗi 0 cảnh báo |
| `npm test` | 48/48 test pass |
| `npm run build` | pass, 41 route |
| smoke test API + trang (curl, 51 luồng) | pass |

Các luồng đã kiểm bằng curl trên dev server (51 luồng, tất cả pass):

1. Landing page 200. 2. `/dashboard` chưa đăng nhập → 307 `/login?next=`. 3. API chưa đăng nhập → 401. 4. API không tồn tại → 404 JSON (không trả HTML). 5–6. Đăng nhập sai → 400, đúng → 200 + cookie. 7. 10 trang trong app đều 200 khi đã đăng nhập; trang lạ → 404. 8. `/login` khi đã đăng nhập → 307 `/dashboard`. 9–11. Tạo sản phẩm 201; validate trả lỗi tiếng Việt; `tags` dạng chuỗi. 12–13. Affiliate link hợp lệ 201 / sai định dạng 400. 14–15. Ảnh data URL 201 / URL ngoài bị từ chối. 16. `generate-content` (kèm `meta.providerLabel`, `isFallbackEngine`, `missing_information`). 17. `regenerate`. 18. `rewrite-content`. 19. `generate-ideas`. 20. Quota `/api/ai/usage`. 21. Rate limit phút: lượt 5 trả 429. 22. Danh sách bài + filter + phân trang. 23–24. Đổi trạng thái hợp lệ 200 / không hợp lệ 400. 25. Lên lịch. 26–28. Xác nhận đã đăng: URL sai 400, thời gian tương lai 400, hợp lệ 200 (lưu views/clicks/revenue). 29–30. Feedback `like`, `use_tone` → ghi giọng văn vào hồ sơ thương hiệu. 31. Sửa bài. 32. Xóa bài. 33–35. Template: tạo 201, PATCH rỗng tăng `usageCount` (1→2), PATCH sửa tên không tăng, xóa 200. 36. Analytics (`kpi`, `series`, `byStatus`, `byPlatform`, `byContentType`, `byProduct`, `topPosts`). 37. Dashboard stats. 38–40. Plan: tạo (kèm slot + bài), sao chép ngày, tạm dừng. 41. Đổi lịch bài đã lên kế hoạch. 42. Hồ sơ thương hiệu. 43. Audit log. 44. Đăng ký user mới (role `user`). 45–47. Cách ly dữ liệu: user 2 thấy 0 sản phẩm, đọc/sửa/xóa dữ liệu user 1 → 404. 48–49. Phân quyền: user thường đọc/ghi AI Settings → 403. 50. Cookie `HttpOnly; SameSite=lax; Path=/`. 51. Quên mật khẩu → reset (token dùng 1 lần, mật khẩu cũ hết hiệu lực) → đổi mật khẩu trong tài khoản (cookie mới dùng được, cookie cũ bị thu hồi) → phiên hết hạn → logout.

Ngoài ra đã kiểm: AI Settings lưu khóa vào DB (`source: "database"`, chỉ trả bản che `gsk••••ghij`), khóa sai → chuỗi dự phòng chạy tới engine nội bộ kèm cảnh báo `FALLBACK_USED`/`PROVIDER_FAILED`, nút "Khôi phục mặc định" trả về giá trị `.env`; và `NEXT_PUBLIC_UPLOAD_MAX_DIMENSION` thực sự được nạp vào bundle trình duyệt (đổi thành 1234 rồi build → số 1234 xuất hiện trong chunk client).

### Ba lỗi nghiêm trọng tìm được nhờ test trình duyệt (curl không phát hiện được)

1. **Toàn bộ Dialog/Drawer/ConfirmDialog không bao giờ mở.** `Overlay` đặt `createPortal` *bên trong* `AnimatePresence`; AnimatePresence không theo dõi được portal nên overlay không hề mount. Nút bấm vẫn nhận click, state vẫn đổi, nhưng không có gì hiện ra. Sửa: portal bọc ngoài AnimatePresence, thêm `useSyncExternalStore` để không gọi `document` khi SSR.
2. **Trang chi tiết sản phẩm trả 500.** `seed.mjs` tạo id bằng `name.replace(/\s+/g,"-")` nên giữ lại ký tự `%` (`seed-serum-vitamin-c-10%-brightlab`); `%` trong path là percent-escape không hợp lệ → route ném lỗi. Sửa: id qua hàm slug, và mọi link dùng `encodeURIComponent`.
3. **Tràn ngang trên mobile** (dashboard 247px, analytics 129px, create 10px ở 390px). Các grid chỉ khai báo cột ở breakpoint (`grid gap-5 lg:grid-cols-3`) nên track mobile là `auto` và phình theo nội dung. Sửa: thêm `grid-cols-1` (= `minmax(0,1fr)`) làm cột cơ sở cho mọi grid.

Ngoài ra: trang Ý tưởng đọc `localStorage` ngay trong lúc render (SSR không có `window`, client thì re-render khi hydrate) → chuyển sang `useSyncExternalStore`.

Chưa kiểm tự động: thao tác thuần bàn phím (focus trap/Escape/aria) và kéo–thả lịch trên cảm ứng.
