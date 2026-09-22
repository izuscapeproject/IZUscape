import "./globals.css";
import ClientLayout from "./ClientLayout";

export const metadata = {
  title: {
    default: "IZUscape | 体験から、次の旅を見つける",
    template: "%s | IZUscape",
  },

  description:
    "IZUscapeは、「やってみたいこと」や「過ごしたい時間」から旅や場所を見つける体験共有サービス。実際に訪れた人の記録から、新しい場所や過ごし方を見つけよう。",

  keywords: [
    "IZUscape",
    "体験",
    "旅",
    "旅行",
    "おでかけ",
    "観光",
    "体験共有",
    "旅行記",
    "旅の記録",
    "おすすめスポット",
    "場所探し",
    "おでかけスポット",
    "観光スポット",
    "旅行スポット",
    "旅先",
    "自然",
    "グルメ",
    "カフェ",
    "温泉",
    "伊豆",
  ],

  metadataBase: new URL(
    "https://iz-uscape.vercel.app"
  ),

  alternates: {
    canonical: "/",
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    title:
      "IZUscape | 体験から、次の旅を見つける",

    description:
      "「やってみたいこと」や「過ごしたい時間」から旅や場所を見つける体験共有サービス。実際に訪れた人の記録から、新しい発見を楽しもう。",

    url: "https://iz-uscape.vercel.app/",

    siteName: "IZUscape",

    locale: "ja_JP",

    type: "website",

    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "IZUscape | 体験から、次の旅を見つける",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title:
      "IZUscape | 体験から、次の旅を見つける",

    description:
      "「やってみたいこと」から旅や場所を見つける体験共有サービス。",

    images: ["/ogp.png"],
  },

  verification: {
    google:
      "0mqKcyIcpKVATqdYV6PBIupiSWWz2N5OzxaGs53jKmg",

    other: {
      "msvalidate.01":
        "EAF47742A1B9562D8D37E3AF0E2CCC5D",
    },
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