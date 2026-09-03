"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db, storage } from "@/lib/firebase";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function EditProfile() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [previewUrl, setPreviewUrl] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  // =========================================================
  // ユーザー取得
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.uid);

        try {
          const snap = await getDoc(
            doc(db, "users", user.uid)
          );

          if (snap.exists()) {
            const data = snap.data();

            setName(data.name || "");
            setBio(data.bio || "");
            setAvatarUrl(
              data.avatarUrl || ""
            );
            setPreviewUrl(
              data.avatarUrl || ""
            );
          } else {
            // Firestoreにまだユーザー情報がない場合
            setName(
              user.displayName || ""
            );

            setAvatarUrl(
              user.photoURL || ""
            );

            setPreviewUrl(
              user.photoURL || ""
            );
          }
        } catch (error) {
          console.error(
            "プロフィール取得エラー:",
            error
          );
        } finally {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // 画像選択
  // =========================================================

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // 画像だけ許可
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    // 5MBまで
    if (file.size > 5 * 1024 * 1024) {
      alert("画像は5MB以下にしてください");
      return;
    }

    const localUrl =
      URL.createObjectURL(file);

    setPreviewUrl(localUrl);
  };

  // =========================================================
  // 画像アップロード
  // =========================================================

  const uploadAvatar = async () => {
    const file =
      fileInputRef.current?.files?.[0];

    if (!file || !userId) {
      return avatarUrl;
    }

    const imageRef = ref(
      storage,
      `users/${userId}/avatar`
    );

    await uploadBytes(
      imageRef,
      file
    );

    const url =
      await getDownloadURL(imageRef);

    return url;
  };

  // =========================================================
  // 保存
  // =========================================================

  const handleSave = async () => {
    if (!userId) {
      alert("ログインしてください");
      return;
    }

    if (!name.trim()) {
      alert("名前を入力してください");
      return;
    }

    try {
      setSaving(true);

      // 新しい画像があればアップロード
      const newAvatarUrl =
        await uploadAvatar();

      await setDoc(
        doc(db, "users", userId),
        {
          name: name.trim(),
          bio: bio.trim(),
          avatarUrl: newAvatarUrl || "",
        },
        {
          merge: true,
        }
      );

      alert("プロフィールを保存しました");

      router.push(
        `/profile/${userId}`
      );

    } catch (error) {
      console.error(
        "プロフィール保存エラー:",
        error
      );

      alert(
        "保存に失敗しました。\nもう一度試してください。"
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // 戻る
  // =========================================================

  const handleBack = () => {
    if (userId) {
      router.push(
        `/profile/${userId}`
      );
    } else {
      router.push("/");
    }
  };

  // =========================================================
  // ローディング
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

  if (!userId) {
    return (
      <main style={container}>
        <section style={empty}>
          <p style={emptyTitle}>
            ログインしてください
          </p>

          <button
            onClick={() =>
              router.push("/login")
            }
            style={loginButton}
          >
            ログインする
          </button>
        </section>
      </main>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <main style={container}>

      {/* 戻る */}
      <button
        onClick={handleBack}
        style={back}
      >
        ← プロフィール
      </button>

      {/* タイトル */}
      <h1 style={title}>
        プロフィール編集
      </h1>

      {/* =====================================================
          PROFILE IMAGE
      ===================================================== */}

      <section style={imageSection}>

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          style={avatarButton}
        >
          <img
            src={
              previewUrl ||
              "/default.png"
            }
            alt=""
            style={avatar}
          />

          <span style={camera}>
            📷
          </span>
        </button>

        <p style={imageHint}>
          プロフィール画像を変更
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          style={{ display: "none" }}
        />

      </section>

      {/* =====================================================
          NAME
      ===================================================== */}

      <section style={section}>

        <label style={label}>
          名前
        </label>

        <input
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
          placeholder="名前を入力"
          maxLength={30}
          style={input}
        />

        <p style={counter}>
          {name.length}/30
        </p>

      </section>

      {/* =====================================================
          BIO
      ===================================================== */}

      <section style={section}>

        <label style={label}>
          自己紹介
        </label>

        <textarea
          value={bio}
          onChange={(e) =>
            setBio(e.target.value)
          }
          placeholder="伊豆で好きな場所や、旅について書いてみよう"
          maxLength={150}
          style={textarea}
        />

        <p style={counter}>
          {bio.length}/150
        </p>

      </section>

      {/* =====================================================
          SAVE
      ===================================================== */}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          ...saveButton,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving
          ? "保存中…"
          : "プロフィールを保存"}
      </button>

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
  border: "none",
  background: "transparent",
  padding: 0,
  color: "#66736D",
  fontSize: "13px",
  cursor: "pointer",
};

const title = {
  margin: "24px 0 28px",
  fontSize: "22px",
  fontWeight: "700",
  color: "#1F3D2B",
};

const imageSection = {
  textAlign: "center" as const,
  marginBottom: "30px",
};

const avatarButton = {
  position: "relative" as const,
  width: "92px",
  height: "92px",
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const avatar = {
  width: "92px",
  height: "92px",
  borderRadius: "50%",
  objectFit: "cover" as const,
  border: "2px solid #EEF1EF",
};

const camera = {
  position: "absolute" as const,
  right: "-2px",
  bottom: "-2px",
  width: "28px",
  height: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: "#1F3D2B",
  fontSize: "13px",
};

const imageHint = {
  margin: "10px 0 0",
  fontSize: "11px",
  color: "#89938F",
};

const section = {
  marginBottom: "20px",
};

const label = {
  display: "block",
  marginBottom: "7px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#46544D",
};

const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "12px 13px",
  border: "1px solid #E3E8E5",
  borderRadius: "12px",
  background: "#fff",
  color: "#26352E",
  fontSize: "13px",
  outline: "none",
};

const textarea = {
  ...input,
  minHeight: "110px",
  resize: "vertical" as const,
  lineHeight: 1.6,
};

const counter = {
  margin: "5px 2px 0",
  textAlign: "right" as const,
  fontSize: "10px",
  color: "#9AA39F",
};

const saveButton = {
  width: "100%",
  padding: "13px",
  border: "none",
  borderRadius: "13px",
  background: "#1F4D36",
  color: "#fff",
  fontSize: "13px",
  fontWeight: "700",
  cursor: "pointer",
};

const loadingText = {
  textAlign: "center" as const,
  color: "#777",
  padding: "60px 0",
};

const empty = {
  marginTop: "40px",
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
  padding: "9px 18px",
  border: "none",
  borderRadius: "999px",
  background: "#1F4D36",
  color: "#fff",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
};