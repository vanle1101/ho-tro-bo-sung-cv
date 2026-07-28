# Cô Hướng Dẫn CV — chạy trên Replit

1. Tạo Repl bằng **Import from ZIP** rồi tải ZIP của dự án lên.
2. Mở **Tools → Secrets**, thêm `OPENAI_API_KEY` và API key của OpenAI Platform.
3. Bấm **Run**.

## Biến môi trường

- `OPENAI_API_KEY` — bắt buộc. Lấy từ OpenAI Platform, không phải tài khoản
  ChatGPT Plus và không ghi khóa trực tiếp vào mã nguồn.
- `OPENAI_MODEL` — tùy chọn, mặc định `gpt-5.6` (alias chất lượng cao).
- `OPENAI_REASONING_EFFORT` — tùy chọn: `low`, `medium`, `high`, `xhigh` hoặc
  `max`; mặc định `medium`.

## Cách hệ thống hoạt động

- Replit chạy giao diện và API route phía server.
- API route gửi CV cùng vị trí ứng tuyển tới OpenAI Responses API.
- OpenAI đọc PDF/DOC/DOCX, thực hiện Giai đoạn 1 và trả về câu hỏi đào sâu.
- Những lượt sau dùng `previous_response_id` để giữ nguyên CV, prompt và toàn bộ
  tiến trình hỏi–đáp.
- Prompt GVHD đầy đủ nằm trong `lib/gvhd-prompt.ts`.
- JD đã được bỏ khỏi giao diện và logic. Người dùng chỉ cần CV và vị trí.
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

Lưu ý: nếu chưa thêm `OPENAI_API_KEY`, giao diện vẫn mở nhưng nút bắt đầu sẽ
thông báo thiếu khóa khi gọi API.
