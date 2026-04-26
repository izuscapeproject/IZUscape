import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: {
    default: "IZUscape | 偶然の出会いを旅する",
    template: "%s | IZUscape",
  },

  description:
    "IZUscapeは、伊豆の偶然の出会いを体験でつなぐ旅アプリ。観光地だけじゃない、誰かのリアルな旅の記録から新しい発見を楽しもう。",

  keywords: [
    "伊豆",
    "観光",
    "旅行",
    "体験共有",
    "旅アプリ",
    "カフェ",
    "グルメ",
    "下田",
    "熱海",
    "伊東",
    "伊豆市",
    "伊豆の国市",
    "修善寺",
    "伊豆長岡",
  ],

  openGraph: {
    title:
      "IZUscape | 偶然の出会いを旅する",

    description:
      "伊豆の偶然の出会いを体験でつなぐ、新しい旅アプリ。",

    url: "https://iz-uscape.vercel.app",

    siteName: "IZUscape",
    locale: "ja_JP",
    type: "website",

    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "IZUscape",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "IZUscape | 偶然の出会いを旅する",

    description:
      "伊豆の体験を共有する新しい旅アプリ",

    images: ["/ogp.png"],
  },

  verification: {
    google:
      "0mqKcyIcpKVATqdYV6PBIupiSWWz2N5OzxaGs53jKmg",
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
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}