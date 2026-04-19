import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: {
    default: "IZUscape | 偶然の旅に出会う",
    template: "%s | IZUscape",
  },
  description: "伊豆の体験を共有する新しい旅アプリ。偶然の出会いを楽しもう。",
  keywords: [
    "伊豆",
    "観光",
    "旅行",
    "カフェ",
    "グルメ",
    "下田",
    "熱海",
    "伊東",
    "伊豆市",
    "伊豆の国市",
    "修善寺",
    "伊豆長岡"
  ],

  openGraph: {
    title: "IZUscape | 偶然の旅に出会う",
    description: "体験を共有する新しい旅アプリ",
    url: "https://iz-uscape.vercel.app",
    siteName: "IZUscape",
    locale: "ja_JP",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "IZUscape",
    description: "伊豆の体験を共有する旅アプリ",
  },

  verification: {
    google: "0mqKcyIcpKVATqdYV6PBIupiSWWz2N5OzxaGs53jKmg",
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}