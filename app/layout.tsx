"use client";

import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

/* 🔥 ここがSEO追加（超重要） */
export const metadata = {
  title: "IZUscape | 偶然の旅に出会う",
  description: "体験を共有する新しい旅アプリ",
  verification: {
    google: "0mqKcyIcpKVATqdYV6PBIupiSWWz2N5OzxaGs53jKmg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [avatarUrl, setAvatarUrl] = useState("/default.png");
  const [isLogin, setIsLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLogin(true);
        setCurrentUser(user.uid);

        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setAvatarUrl(snap.data().avatarUrl || "/default.png");
        }
      } else {
        setIsLogin(false);
        setCurrentUser(null);
        setAvatarUrl("/default.png");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <html lang="ja">
      <body style={{ margin: 0, background: "#f5f5f5" }}>
        
        {/* HEADER */}
        <header style={header}>
          <div style={headerInner}>
            <Link href="/" style={logoWrap}>
              <Image src="/logo.png" alt="IZUscape" width={28} height={28} />
              <span style={logoText}>IZUscape</span>
            </Link>

            <div style={navWrap}>
              <Link href="/post" style={navText}>投稿</Link>
              <Link href="/saved" style={navText}>保存</Link>

              {isLogin ? (
                <>
                  <Link href={`/profile/${currentUser}`}>
                    <img src={avatarUrl} style={avatar} />
                  </Link>

                  <button onClick={handleLogout} style={logoutStyle}>
                    ログアウト
                  </button>
                </>
              ) : (
                <Link href="/login" style={navText}>
                  ログイン
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main style={main}>
          {children}
        </main>

        {/* 下タブ */}
        <nav style={bottomNav}>
          <Link href="/" style={tab}>🏠</Link>
          <Link href="/post" style={tab}>➕</Link>
          <Link href="/saved" style={tab}>❤️</Link>

          <Link
            href={isLogin && currentUser ? `/profile/${currentUser}` : "/login"}
            style={tab}
          >
            {isLogin ? (
              <img src={avatarUrl} style={tabAvatar} />
            ) : (
              "👤"
            )}
          </Link>
        </nav>
      </body>
    </html>
  );
}

/* STYLE */

const header: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  background: "#fff",
  borderBottom: "1px solid #eee",
  zIndex: 1000,
};

const headerInner: React.CSSProperties = {
  maxWidth: "500px",
  margin: "0 auto",
  padding: "10px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  textDecoration: "none",
};

const logoText: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: "20px",
  color: "#111",
};

const navWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const navText: React.CSSProperties = {
  fontSize: "14px",
  color: "#333",
  textDecoration: "none",
};

const avatar: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  objectFit: "cover",
};

const logoutStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#666",
  background: "none",
  border: "none",
  cursor: "pointer",
};

const main: React.CSSProperties = {
  paddingTop: "70px",
  paddingBottom: "70px",
  maxWidth: "500px",
  margin: "0 auto",
  paddingLeft: "16px",
  paddingRight: "16px",
};

const bottomNav: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  width: "100%",
  background: "#fff",
  borderTop: "1px solid #eee",
  display: "flex",
  justifyContent: "space-around",
  padding: "10px 0",
  zIndex: 1000,
};

const tab: React.CSSProperties = {
  fontSize: "20px",
  textDecoration: "none",
};

const tabAvatar: React.CSSProperties = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
};