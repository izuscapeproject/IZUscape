"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] =
    useState("");

  // ログイン状態取得
  // 🔥 Firebase Auth の photoURL を使う
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);

          if (currentUser) {
            setProfileImage(
              currentUser.photoURL || ""
            );
          } else {
            setProfileImage("");
          }
        }
      );

    return () => unsubscribe();
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  // ログアウト
  const handleLogout = async () => {
    const ok = confirm(
      "ログアウトしますか？"
    );

    if (!ok) return;

    try {
      await signOut(auth);
      alert("ログアウトしました");
      router.push("/login");
    } catch (error) {
      console.error(error);
      alert("ログアウトに失敗しました");
    }
  };

  return (
    <>
      {/* 上ヘッダー */}
      <header className="header">
        <Link href="/" style={logo}>
          IZUscape
        </Link>

        <div style={headerRight}>
          {user ? (
            <>
              <Link
                href="/post"
                style={headerLink}
              >
                投稿
              </Link>

              <Link
                href="/saved"
                style={headerLink}
              >
                保存
              </Link>

              {/* 上プロフィール画像 */}
              <Link
                href={`/profile/${user.uid}`}
                style={profileLink}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="profile"
                    style={profileImg}
                  />
                ) : (
                  <div
                    style={fallbackIcon}
                  >
                    👤
                  </div>
                )}
              </Link>

              <button
                onClick={handleLogout}
                style={logoutBtn}
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/login"
              style={loginBtn}
            >
              ログイン
            </Link>
          )}
        </div>
      </header>

      {/* メイン */}
      <main
        style={{
          paddingBottom: "110px",
        }}
      >
        {children}
      </main>

      {/* 下ナビ */}
      <footer style={footer}>
        {/* ホーム */}
        <Link
          href="/"
          style={navItem(
            isActive("/")
          )}
        >
          <div
            style={iconCircle(
              isActive("/")
            )}
          >
            🏠
          </div>
          <span>ホーム</span>
        </Link>

        {/* 探す */}
        <Link
          href="/area/shimoda"
          style={navItem(
            pathname.includes(
              "/area"
            )
          )}
        >
          <div
            style={iconCircle(
              pathname.includes(
                "/area"
              )
            )}
          >
            🔍
          </div>
          <span>探す</span>
        </Link>

        {/* 投稿 */}
        <Link
          href={
            user
              ? "/post"
              : "/login"
          }
          style={centerPost}
        >
          <div style={postCircle}>
            ＋
          </div>

          <span style={postText}>
            投稿
          </span>
        </Link>

        {/* 保存 */}
        <Link
          href={
            user
              ? "/saved"
              : "/login"
          }
          style={navItem(
            isActive("/saved")
          )}
        >
          <div
            style={iconCircle(
              isActive("/saved")
            )}
          >
            ❤️
          </div>
          <span>保存</span>
        </Link>

        {/* マイ */}
        <Link
          href={
            user
              ? `/profile/${user.uid}`
              : "/login"
          }
          style={navItem(
            pathname.includes(
              "/profile"
            )
          )}
        >
          {profileImage ? (
            <img
              src={profileImage}
              alt="profile"
              style={
                bottomProfileImg
              }
            />
          ) : (
            <div
              style={iconCircle(
                pathname.includes(
                  "/profile"
                )
              )}
            >
              👤
            </div>
          )}

          <span>マイ</span>
        </Link>
      </footer>
    </>
  );
}

////////////////////////////////////////////////

const logo = {
  fontWeight: "bold",
  fontSize: "28px",
  color: "#1F3D2B",
  textDecoration: "none",
};

const headerRight = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const headerLink = {
  textDecoration: "none",
  color: "#333",
  fontWeight: "600",
  fontSize: "14px",
};

const profileLink = {
  textDecoration: "none",
};

const profileImg = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  objectFit: "cover" as const,
};

const bottomProfileImg = {
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  objectFit: "cover" as const,
  background: "#EAF5EF",
};

const fallbackIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "#EAF5EF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
};

const loginBtn = {
  textDecoration: "none",
  background: "#1F3D2B",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "14px",
};

const logoutBtn = {
  border: "none",
  background: "transparent",
  color: "#666",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "14px",
};

const footer = {
  position: "fixed" as const,
  bottom: 0,
  left: 0,
  width: "100%",
  background:
    "rgba(255,255,255,0.95)",
  backdropFilter: "blur(10px)",
  borderTop: "1px solid #eee",
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  padding: "10px 0 14px",
  zIndex: 999,
  boxShadow:
    "0 -4px 20px rgba(0,0,0,0.04)",
};

const navItem = (
  active: boolean
) => ({
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  fontSize: "11px",
  color: active
    ? "#1F3D2B"
    : "#999",
  textDecoration: "none",
  fontWeight: active
    ? "bold"
    : "normal",
  gap: "6px",
});

const iconCircle = (
  active: boolean
) => ({
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: active
    ? "#EAF5EF"
    : "transparent",
  fontSize: "20px",
  transition: "0.2s",
});

const centerPost = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  textDecoration: "none",
  marginTop: "-30px",
};

const postCircle = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "#1F3D2B",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  fontWeight: "bold",
  boxShadow:
    "0 8px 24px rgba(31,61,43,0.25)",
};

const postText = {
  marginTop: "6px",
  fontSize: "11px",
  color: "#1F3D2B",
  fontWeight: "bold",
};