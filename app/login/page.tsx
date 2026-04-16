"use client";

import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  // 🔥 ユーザー作成（存在しない場合のみ）
  const createUserIfNotExists = async (user: any) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        name: user.displayName || "ユーザー",
        bio: "",
        avatarUrl: user.photoURL || "/default.png",
        createdAt: new Date(),
      });
    }
  };

  // 🔥 ログイン処理
  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await createUserIfNotExists(result.user);

      alert("ログイン成功！");

      // 🔥 ここ重要（ホームに戻す）
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("ログイン失敗");
    }
  };

  return (
    <div style={wrap}>
      <h2 style={title}>ログイン</h2>

      <button onClick={login} style={btn}>
        Googleでログイン
      </button>
    </div>
  );
}

//
// 🎨 UI
//

const wrap = {
  padding: "40px 20px",
  textAlign: "center" as const,
};

const title = {
  fontSize: "20px",
  marginBottom: "20px",
};

const btn = {
  padding: "12px 20px",
  borderRadius: "10px",
  border: "none",
  background: "#4285F4",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};