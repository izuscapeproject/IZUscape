"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function EditProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // 🔥 ユーザー取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert("ログインしてください");
        return;
      }

      console.log("ログインユーザー:", user.uid);

      setUserId(user.uid);

      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        const data = snap.data();
        setName(data.name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatarUrl || "");
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔥 保存
  const handleSave = async () => {
    if (!userId) {
      alert("userIdがない");
      return;
    }

    console.log("保存 userId:", userId);

    await setDoc(
      doc(db, "users", userId),
      {
        name,
        bio,
        avatarUrl,
      },
      { merge: true }
    );

    alert("保存した！");
    location.href = `/profile/${userId}`;
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>プロフィール編集</h2>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="名前"
        style={input}
      />

      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="自己紹介"
        style={{ ...input, height: "100px" }}
      />

      <input
        value={avatarUrl}
        onChange={(e) => setAvatarUrl(e.target.value)}
        placeholder="アイコンURL"
        style={input}
      />

      {avatarUrl && <img src={avatarUrl} style={preview} />}

      <button onClick={handleSave} style={btn}>
        保存
      </button>
    </div>
  );
}

const input = {
  width: "100%",
  padding: "10px",
  marginBottom: "10px",
};

const btn = {
  width: "100%",
  padding: "10px",
  background: "#000",
  color: "#fff",
};

const preview = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
};