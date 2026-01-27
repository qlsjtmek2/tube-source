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
  title: "TubeSource - YouTube Strategy Collector",
  description: "Analyze, collect, and strategize with YouTube videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
