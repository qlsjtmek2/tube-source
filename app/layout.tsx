import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SearchProvider } from "@/store/search-context";
import { ChannelSearchProvider } from "@/store/channel-search-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TubeSource - 유튜브 콘텐츠 분석 도구",
  description: "유튜브 영상 검색, AI 분석, 다운로드를 한 곳에서. 콘텐츠 크리에이터를 위한 전략 도구.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SearchProvider>
          <ChannelSearchProvider>
            {children}
          </ChannelSearchProvider>
        </SearchProvider>
      </body>
    </html>
  );
}
