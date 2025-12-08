# Simple Scraper Extension

Một tiện ích mở rộng (chronium) kèm một backend đơn giản để lưu dữ liệu. Repo này được thiết kế để minh hoạ cách chọn vùng dữ liệu trên trang, xem trước và gửi dữ liệu về backend.

**Mục tiêu:** cung cấp công cụ nhỏ để 'scrape' vùng nội dung trên trang và lưu vào backend qua API.

---

**Cấu trúc thư mục**
- `backend/` : server phía sau (Node.js). Chứa `package.json` và `server.js`.
- `extension/` : mã nguồn tiện ích mở rộng (HTML, JS, manifest). Các file chính:
  - `popup.html`, `popup.js` — giao diện popup của extension.
  - `sidepanel.html`, `sidepanel.js` — side panel (panel) của extension.
  - `options.html`, `options.js` — trang cấu hình (API URL, API Key).
  - `styles.css` — stylesheet dùng chung cho các trang trong `extension/`.

---

**Yêu cầu**
- Node.js (v20+ khuyến nghị) để chạy backend.
- Trình duyệt (Chrome / Edge / Brave) để cài tiện ích mở rộng.

---

**Chạy backend (local)**
1. Mở terminal, vào thư mục `backend`:

```bash
cd backend
```

2. Cài phụ thuộc và khởi động server:

```bash
npm install
# nếu package.json có script "start":
npm start
# hoặc trực tiếp:
node server.js
```

3. Server sẽ lắng nghe ở cổng mà `server.js` cấu hình (mặc định có thể là `3000`).

Ghi chú: nếu bạn thay đổi cổng hoặc đường dẫn API, cập nhật `options.html` trong extension hoặc cấu hình trong trang Options của extension.

---

**Cài đặt tiện ích mở rộng (Load unpacked)**
1. Mở Chrome/Edge, truy cập `chrome://extensions/` (hoặc Edge tương tự). Bật `Developer mode`.
2. Chọn `Load unpacked` và chọn thư mục `extension/` của repo này.
3. Extension sẽ xuất hiện trong thanh công cụ; mở `Popup` hoặc `Side Panel` để dùng.

Đối với Firefox: mở `about:debugging#/runtime/this-firefox` → `Load Temporary Add-on` → chọn `extension/manifest.json`.

---

**Sử dụng cơ bản**
- Mở trang web bất kỳ, bật extension và chọn `Chọn vùng dữ liệu` để chọn phần tử trên trang (thủ công), hoặc nhập `CSS selector` và bấm `Lấy tự động theo selector`.
- Nội dung lấy được sẽ hiển thị trong vùng `Preview`.
- Bấm `Lưu vào DB` để gửi dữ liệu về backend. Cấu hình `API URL` và `API Key` tại trang `Options` nếu cần.

Lưu ý: tất cả các phần tử quan trọng (nút, input, vùng preview) vẫn giữ nguyên `id` để các script (`popup.js`, `sidepanel.js`, `options.js`) hoạt động bình thường.

---

**Tùy chỉnh & phát triển**
- Styles được tách vào `extension/styles.css` để tái sử dụng giữa các trang HTML.
- Bạn có thể đồng bộ layout cho `popup.html` và `options.html` bằng cách dùng `.container` / `.card` từ `styles.css`.
- Nếu muốn SCSS / build pipeline: có thể chuyển `styles.css` thành `styles.scss` và thêm bước build.

**Kiểm tra nhanh**
- Mở DevTools (F12) trên popup/sidepanel nếu cần debug DOM/JS.

---

**Đóng góp**
- Mở PR với phần mô tả thay đổi, kèm demo nếu thay đổi giao diện/flow.

**License**
- Mặc định không có license trong repo này. Nếu cần, thêm file `LICENSE` (ví dụ MIT) và cập nhật README.

