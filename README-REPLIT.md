# Cô Hướng Dẫn CV — chạy trên Replit

1. Tạo Repl bằng **Import from ZIP** rồi tải ZIP của dự án lên.
2. Mở **Tools → Secrets**, thêm `GEMINI_API_KEY` (lấy từ Google AI Studio) và
   `GEMINI_MODEL` (ví dụ `gemini-2.5-flash`).
3. Bấm **Run**.

## Biến môi trường

- `GEMINI_API_KEY` — bắt buộc. Lấy từ [Google AI Studio](https://aistudio.google.com/apikey),
  không ghi khóa trực tiếp vào mã nguồn.
- `GEMINI_MODEL` — **bắt buộc**. Tên model Gemini sẽ dùng, ví dụ
  `gemini-2.5-flash` hoặc `gemini-2.5-pro`. Khi Google đổi tên hoặc ngừng hỗ trợ
  model, chỉ cần cập nhật Secret này mà không cần chỉnh code. Nếu tên model sai,
  giao diện sẽ báo lỗi rõ ràng kèm hướng dẫn sửa.

## Cách hệ thống hoạt động

- Replit chạy giao diện và API route phía server.
- API route gửi CV (PDF) cùng vị trí ứng tuyển tới Gemini generateContent API.
- Gemini đọc PDF, thực hiện Giai đoạn 1 và trả về câu hỏi đào sâu.
- Gemini không lưu phiên phía server, nên mỗi lượt sau trình duyệt gửi lại CV
  cùng toàn bộ lịch sử hỏi–đáp để giữ nguyên tiến trình.
- Prompt GVHD đầy đủ nằm trong `lib/gvhd-prompt.ts`.
- JD đã được bỏ khỏi giao diện và logic. Người dùng chỉ cần CV và vị trí.
- Chỉ hỗ trợ CV dạng PDF (Gemini không đọc DOC/DOCX).
- Phần năng lực sử dụng AI chỉ được hỏi khi hồ sơ/câu trả lời có nhắc tới AI
  hoặc vị trí thật sự yêu cầu.

## Chạy ngoài Replit

Yêu cầu Node.js 22.13 trở lên:

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Sau đó mở địa chỉ do terminal hiển thị.

## Kiểm tra trước khi triển khai

```bash
npm run lint
npm test
```

Lưu ý: nếu chưa thêm `GEMINI_API_KEY`, giao diện vẫn mở nhưng nút bắt đầu sẽ
thông báo thiếu khóa khi gọi API.
