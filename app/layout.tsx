import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Margin — 交易研究手记",
  description: "一个安静的个人研究空间。记录美股与加密资产的学习、观察、策略和复盘。",
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
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
