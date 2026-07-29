# CV-Support

**VanLe personal project**

CV-Support là dự án được xây dựng để hỗ trợ bản thân mình xem lại, phân tích và chỉnh sửa CV. Bên cạnh đó, dự án cũng hướng đến việc hỗ trợ các bạn sinh viên đang cần hoàn thiện CV trước khi ứng tuyển.

Ứng dụng giúp đọc CV, xác định những nội dung còn thiếu hoặc chưa rõ, đặt câu hỏi để hiểu sâu hơn về kinh nghiệm của người dùng và đưa ra gợi ý chỉnh sửa phù hợp với vị trí ứng tuyển.

## Trải nghiệm

Truy cập ứng dụng tại: **[https://van-le-project.replit.app/](https://van-le-project.replit.app/)**

## Tính năng chính

- Tải lên và phân tích CV ở định dạng PDF.
- Đánh giá CV theo vị trí ứng tuyển.
- Đặt câu hỏi để làm rõ kinh nghiệm, kỹ năng và dự án.
- Gợi ý cách trình bày nội dung CV rõ ràng, có căn cứ hơn.
- Duy trì lịch sử trao đổi trong phiên để hỗ trợ chỉnh sửa theo từng bước.

## Công nghệ sử dụng

- TypeScript
- React 19
- Next.js 16
- Vinext và Vite
- Gemini API
- Replit

## Yêu cầu

- Node.js `>= 22.13.0`
- Gemini API key từ [Google AI Studio](https://aistudio.google.com/apikey)

## Cài đặt và chạy trên máy

1. Clone repository:

   ```bash
   git clone https://github.com/vanle1101/ho-tro-bo-sung-cv.git
   cd ho-tro-bo-sung-cv
   ```

2. Cài đặt thư viện:

   ```bash
   npm install
   ```

3. Cấu hình biến môi trường:

   ```env
   GEMINI_API_KEY=your_api_key
   GEMINI_MODEL=gemini-2.5-flash
   ```

4. Khởi động ứng dụng:

   ```bash
   npm run dev -- --host 0.0.0.0 --port 3000
   ```

5. Mở địa chỉ được hiển thị trong terminal.

## Kiểm tra mã nguồn

```bash
npm run lint
npm test
```

## Chạy trên Replit

Hướng dẫn cấu hình và triển khai trên Replit được trình bày trong **[README-REPLIT.md](./README-REPLIT.md)**.

## Lưu ý

- Ứng dụng hiện chỉ hỗ trợ CV dạng PDF, dung lượng tối đa 10 MB.
- `GEMINI_API_KEY` phải được lưu trong biến môi trường hoặc Replit Secrets, không ghi trực tiếp vào mã nguồn.
- Tên model Gemini có thể thay đổi theo thời gian; cập nhật `GEMINI_MODEL` khi model đang dùng không còn được hỗ trợ.
