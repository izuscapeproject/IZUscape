import "./globals.css";
import ClientLayout from "./ClientLayout"; // ←これ追加

export const metadata = {
  verification: {
    google: "0mqKcyIcpKVATqdYV6PBIupiSWWz2N5OzxaGs53jKmg",
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