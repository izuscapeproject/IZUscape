"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Firebaseログイン状態
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
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

  // ページ移動したらメニューを閉じる
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // ログアウト
  const handleLogout = async () => {
    const ok = window.confirm(
      "ログアウトしますか？"
    );

    if (!ok) return;

    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error(
        "ログアウトに失敗しました",
        error
      );

      alert(
        "ログアウトに失敗しました"
      );
    }
  };

  const isActive = (
    path: string
  ) => {
    return pathname === path;
  };

  return (
    <>
      {/* =====================================
          HEADER
      ===================================== */}

      <header className="izu-header">

        <div className="izu-header-inner">

          {/* ロゴ */}
          <Link
            href="/"
            className="izu-logo"
            aria-label="IZUscape ホーム"
          >
            <span className="izu-logo-main">
              IZUscape
            </span>

            <span className="izu-logo-sub">
              memories of Izu
            </span>
          </Link>

          {/* PC NAV */}
          <nav
            className="izu-header-nav"
            aria-label="メインナビゲーション"
          >

            <Link
              href="/area/shimoda"
              className={
                pathname.startsWith("/area")
                  ? "active"
                  : ""
              }
            >
              探す
            </Link>

            {user && (
              <Link
                href="/saved"
                className={
                  isActive("/saved")
                    ? "active"
                    : ""
                }
              >
                保存
              </Link>
            )}

            {user && (
              <Link
                href={`/profile/${user.uid}`}
                className={
                  pathname.startsWith(
                    "/profile"
                  )
                    ? "active"
                    : ""
                }
              >
                マイページ
              </Link>
            )}

            {user ? (
              <Link
                href="/post"
                className="izu-record-link"
              >
                <span>
                  旅を記録する
                </span>

                <span className="izu-record-arrow">
                  ↗
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="izu-login-link"
              >
                ログイン
              </Link>
            )}

            {/* プロフィール画像 */}
            {user && (
              <Link
                href={`/profile/${user.uid}`}
                className="izu-header-profile"
                aria-label="マイページ"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt=""
                  />
                ) : (
                  <span>
                    ○
                  </span>
                )}
              </Link>
            )}

          </nav>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            className={
              menuOpen
                ? "izu-menu-button open"
                : "izu-menu-button"
            }
            onClick={() =>
              setMenuOpen(
                (prev) => !prev
              )
            }
            aria-label={
              menuOpen
                ? "メニューを閉じる"
                : "メニューを開く"
            }
            aria-expanded={menuOpen}
          >
            <span />
            <span />
          </button>

        </div>

        {/* =====================================
            MOBILE MENU
        ===================================== */}

        <div
          className={
            menuOpen
              ? "izu-mobile-menu open"
              : "izu-mobile-menu"
          }
        >

          <div className="izu-mobile-menu-inner">

            <p className="izu-mobile-kicker">
              IZUSCAPE
            </p>

            <nav
              className="izu-mobile-nav"
              aria-label="モバイルナビゲーション"
            >

              <Link href="/area/shimoda">
                <span>
                  思い出を探す
                </span>

                <span>↗</span>
              </Link>

              {user && (
                <Link href="/saved">
                  <span>
                    保存した思い出
                  </span>

                  <span>↗</span>
                </Link>
              )}

              {user && (
                <Link
                  href={`/profile/${user.uid}`}
                >
                  <span>
                    マイページ
                  </span>

                  <span>↗</span>
                </Link>
              )}

              <div className="izu-mobile-divider" />

              {user ? (
                <Link
                  href="/post"
                  className="primary"
                >
                  <span>
                    旅を記録する
                  </span>

                  <span>↗</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="primary"
                >
                  <span>
                    ログインする
                  </span>

                  <span>↗</span>
                </Link>
              )}

              {user && (
                <button
                  type="button"
                  className="izu-mobile-logout"
                  onClick={
                    handleLogout
                  }
                >
                  ログアウト
                </button>
              )}

            </nav>

            <p className="izu-mobile-caption">
              誰かの旅が、
              <br />
              あなたの旅になる。
            </p>

          </div>

        </div>

      </header>

      {/* =====================================
          MAIN
      ===================================== */}

      <main className="izu-main">
        {children}
      </main>
    </>
  );
}