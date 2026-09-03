"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function ProfileSettingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  // =========================================================
  // 現在のログインユーザー
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // アカウント切り替え
  // =========================================================

  const switchAccount = async () => {
    try {
      setSwitching(true);

      const provider =
        new GoogleAuthProvider();

      // Googleアカウント選択画面を表示
      provider.setCustomParameters({
        prompt: "select_account",
      });

      await signInWithPopup(
        auth,
        provider
      );

      alert(
        "アカウントを切り替えました"
      );

      router.push("/");

    } catch (error: any) {
      console.error(
        "[IZUscape] アカウント切り替え失敗:",
        error
      );

      if (
        error?.code !==
        "auth/popup-closed-by-user"
      ) {
        alert(
          "アカウントを切り替えられませんでした"
        );
      }
    } finally {
      setSwitching(false);
    }
  };

  // =========================================================
  // ログアウト
  // =========================================================

  const logout = async () => {
    const ok = window.confirm(
      "ログアウトしますか？"
    );

    if (!ok) return;

    try {
      await signOut(auth);

      router.push("/login");
    } catch (error) {
      console.error(
        "[IZUscape] ログアウト失敗:",
        error
      );

      alert(
        "ログアウトできませんでした"
      );
    }
  };

  // =========================================================
  // 読み込み中
  // =========================================================

  if (loading) {
    return (
      <main style={container}>
        <p style={loadingText}>
          読み込み中…
        </p>
      </main>
    );
  }

  // =========================================================
  // 未ログイン
  // =========================================================

  if (!user) {
    return (
      <main style={container}>

        <Link
          href="/"
          style={back}
        >
          ← ホーム
        </Link>

        <section style={empty}>
          <p style={emptyTitle}>
            ログインしていません
          </p>

          <Link
            href="/login"
            style={loginButton}
          >
            ログインする
          </Link>
        </section>

      </main>
    );
  }

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <main style={container}>

      {/* 戻る */}
      <Link
        href={`/profile/${user.uid}`}
        style={back}
      >
        ← プロフィール
      </Link>

      {/* タイトル */}
      <h1 style={title}>
        ⚙️ アカウント設定
      </h1>

      {/* =====================================================
          ACCOUNT
      ===================================================== */}

      <section style={section}>

        <p style={sectionLabel}>
          アカウント
        </p>

        <div style={accountCard}>

          <img
            src={
              user.photoURL ||
              "/default.png"
            }
            alt=""
            style={avatar}
          />

          <div style={accountInfo}>

            <p style={name}>
              {user.displayName ||
                "ユーザー"}
            </p>

            <p style={email}>
              {user.email ||
                "メールアドレス未設定"}
            </p>

          </div>

        </div>

      </section>

      {/* =====================================================
          SWITCH ACCOUNT
      ===================================================== */}

      <section style={section}>

        <p style={sectionLabel}>
          アカウント
        </p>

        <button
          type="button"
          onClick={switchAccount}
          disabled={switching}
          style={{
            ...menuButton,
            opacity: switching
              ? 0.6
              : 1,
          }}
        >

          <span style={menuIcon}>
            🔄
          </span>

          <span style={menuText}>
            {switching
              ? "切り替え中…"
              : "アカウントを切り替える"}
          </span>

          {!switching && (
            <span style={arrow}>
              ›
            </span>
          )}

        </button>

      </section>

      {/* =====================================================
          LOGOUT
      ===================================================== */}

      <section style={section}>

        <button
          type="button"
          onClick={logout}
          style={logoutButton}
        >

          <span style={menuIcon}>
            🚪
          </span>

          <span>
            ログアウト
          </span>

        </button>

      </section>

      {/* =====================================================
          INFO
      ===================================================== */}

      <p style={info}>
        Googleアカウントを使って
        IZUscapeにログインしています。
      </p>

    </main>
  );
}

// =========================================================
// STYLE
// =========================================================

const container = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "24px 20px 100px",
};

const back = {
  color: "#66736D",
  textDecoration: "none",
  fontSize: "13px",
};

const title = {
  margin: "24px 0 26px",
  fontSize: "22px",
  fontWeight: "700",
  color: "#1F3D2B",
};

const section = {
  marginBottom: "22px",
};

const sectionLabel = {
  margin: "0 0 8px 4px",
  fontSize: "11px",
  fontWeight: "700",
  color: "#89938F",
};

const accountCard = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  padding: "15px",
  background: "#fff",
  border: "1px solid #EEF1EF",
  borderRadius: "15px",
};

const avatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  objectFit: "cover" as const,
  flexShrink: 0,
};

const accountInfo = {
  minWidth: 0,
};

const name = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "700",
  color: "#26352E",
};

const email = {
  margin: "4px 0 0",
  fontSize: "11px",
  color: "#89938F",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const menuButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "15px",
  border: "1px solid #EEF1EF",
  borderRadius: "15px",
  background: "#fff",
  color: "#26352E",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  textAlign: "left" as const,
};

const menuIcon = {
  width: "28px",
  textAlign: "center" as const,
  fontSize: "18px",
};

const menuText = {
  flex: 1,
};

const arrow = {
  fontSize: "22px",
  color: "#A0AAA5",
};

const logoutButton = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "15px",
  border: "1px solid #F0E4E4",
  borderRadius: "15px",
  background: "#fff",
  color: "#A34B4B",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
  textAlign: "left" as const,
};

const info = {
  marginTop: "30px",
  textAlign: "center" as const,
  fontSize: "11px",
  lineHeight: 1.6,
  color: "#9AA39F",
};

const loadingText = {
  textAlign: "center" as const,
  color: "#777",
  padding: "60px 0",
};

const empty = {
  marginTop: "30px",
  padding: "35px 20px",
  textAlign: "center" as const,
  background: "#FAFBFA",
  borderRadius: "16px",
};

const emptyTitle = {
  margin: "0 0 15px",
  fontSize: "14px",
  fontWeight: "700",
  color: "#46544D",
};

const loginButton = {
  display: "inline-block",
  padding: "9px 18px",
  borderRadius: "999px",
  background: "#1F4D36",
  color: "#fff",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: "700",
};