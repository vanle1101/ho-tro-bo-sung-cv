# CV-Support — Chạy trên Replit

**VanLe personal project**

CV-Support là dự án hỗ trợ xem lại, phân tích và chỉnh sửa CV cho bản thân, đồng thời có thể hỗ trợ các bạn sinh viên đang cần hoàn thiện CV trước khi ứng tuyển.

Trải nghiệm ứng dụng tại: **[https://van-le-project.replit.app/](https://van-le-project.replit.app/)**

## Cách chạy trên Replit

1. Mở repository GitHub và tải mã nguồn hoặc file ZIP của dự án.
2. Trên Replit, chọn **Create Repl → Import from GitHub** hoặc **Import from ZIP**.
3. Mở **Tools → Secrets** và thêm các biến môi trường:
   - `GEMINI_API_KEY`: API key lấy từ [Google AI Studio](https://aistudio.google.com/apikey).
   - `GEMINI_MODEL`: tên model Gemini muốn sử dụng, ví dụ `gemini-2.5-flash`.
4. Nhấn **Run**. Replit sẽ cài đặt thư viện và khởi động ứng dụng.

## Biến môi trường

| Tên biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `GEMINI_API_KEY` | Có | Khóa dùng để gọi Gemini API. Lưu trong Replit Secrets và không ghi trực tiếp vào mã nguồn. |
| `GEMINI_MODEL` | Có | Tên model Gemini, ví dụ `gemini-2.5-flash` hoặc một model hợp lệ khác đang được Google hỗ trợ. |

Khi Google đổi tên hoặc ngừng hỗ trợ một model, chỉ cần cập nhật `GEMINI_MODEL` trong Replit Secrets rồi chạy lại ứng dụng.

## Cách hệ thống hoạt động

- Replit chạy giao diện và API route phía server.
- Người dùng tải CV dạng PDF và nhập vị trí muốn ứng tuyển.
- API route gửi CV cùng nội dung trao đổi đến Gemini API để phân tích.
- Ứng dụng đặt câu hỏi làm rõ kinh nghiệm, kỹ năng và dự án trước khi đưa ra gợi ý chỉnh sửa.
- Lịch sử hỏi đáp được trình duyệt gửi lại ở mỗi lượt để duy trì tiến trình trong phiên.
- API key chỉ được sử dụng ở phía server.

## Giới hạn hiện tại

- Chỉ hỗ trợ CV dạng PDF.
- Dung lượng file tối đa 10 MB.
- File Word `.doc` hoặc `.docx` cần được xuất sang PDF trước khi tải lên.

## Chạy ngoài Replit

Yêu cầu Node.js `>= 22.13.0`.

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Sau khi ứng dụng khởi động, mở địa chỉ được hiển thị trong terminal.

## Kiểm tra trước khi triển khai

```bash
npm run lint
npm test
```

Nếu chưa cấu hình `GEMINI_API_KEY` hoặc `GEMINI_MODEL`, giao diện vẫn có thể mở nhưng yêu cầu phân tích CV sẽ báo thiếu cấu hình.
