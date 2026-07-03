import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "天罡智算抽奖系统",
  description: "滚动号码牌抽奖系统，支持后台轮次、名额、号码池与预设中奖号码。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
