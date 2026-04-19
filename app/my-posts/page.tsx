"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import PostCard from "@/app/components/PostCard";

export default function MyPosts() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔐 ログイン状態取得
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 📦 自分の投稿取得
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(data);
    };

    fetchPosts();
  }, [user]);

  // 🗑 投稿削除
  const handleDelete = async (id: string) => {
    const ok = confirm("この投稿を削除しますか？");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "posts", id));

      // UIからも削除
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("削除失敗");
    }
  };

  // ⏳ ローディング
  if (loading) return <p style={center}>読み込み中...</p>;

  // 🔒 未ログイン
  if (!user) return <p style={center}>ログインしてください</p>;

  return (
    <div style={container}>
      <h2 style={title}>自分の投稿</h2>

      {posts.length === 0 && (
        <p style={empty}>まだ投稿がありません</p>
      )}

      <div style={grid}>
        {posts.map((p) => (
          <div key={p.id} style={cardWrap}>
            <PostCard
              post={{
                id: p.id,
                title: p.title,
                imageUrl: p.images?.[0] || "",
                slug: p.slug,
              }}
            />

            <button
              onClick={() => handleDelete(p.id)}
              style={deleteBtn}
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

////////////////////////////////////////////////

// 🎨 スタイル

const container = {
  maxWidth: "800px",
  margin: "0 auto",
  padding: "20px",
};

const title = {
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "20px",
};

const grid = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "16px",
};

const cardWrap = {
  width: "200px",
};

const deleteBtn = {
  marginTop: "8px",
  width: "100%",
  padding: "8px",
  background: "#ff4d4f",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontSize: "12px",
};

const empty = {
  textAlign: "center" as const,
  color: "#777",
};

const center = {
  textAlign: "center" as const,
  marginTop: "40px",
};