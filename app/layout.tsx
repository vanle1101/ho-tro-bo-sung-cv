import type { Metadata } from "next";
import "@fontsource/lora/vietnamese-400.css";
import "@fontsource/lora/vietnamese-600.css";
import "@fontsource/lora/vietnamese-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hoàn Thiện CV — Đọc kỹ, hỏi sâu, sửa đúng",
  description:
    "Quy trình hướng dẫn xác định năng lực, định hướng nghề nghiệp và hoàn thiện CV dựa trên bằng chứng.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
