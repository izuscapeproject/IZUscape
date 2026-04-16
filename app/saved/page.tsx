"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function SavedPage() {
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // 🔥 ログイン取得
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // 🔥 保存取得
  useEffect(() => {
    if (!userId) return;

    const fetchSaved = async () => {
      const q = query(
        collection(db, "saved"),
        where("userId", "==", userId)
      );

      const savedSnap = await getDocs(q);
      const savedIds = savedSnap.docs.map((d) => d.data().postId);

      const postSnap = await getDocs(collection(db, "posts"));
      const posts = postSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filtered = posts.filter((p: any) =>
        savedIds.includes(p.id)
      );

      setSavedPosts(filtered);
    };

    fetchSaved();
  }, [userId]);

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← 戻る
      </Link>

      <h2 style={titleMain}>保存した体験</h2>

      {savedPosts.length === 0 ? (
        <div style={empty}>
          <p>まだ保存がありません</p>
          <small>気に入った体験を保存してみよう</small>
        </div>
      ) : (
        <div style={grid}>
          {savedPosts.map((post) => (
            <Link key={post.id} href={`/experience/${post.id}`}>
              <div
                style={card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(31,61,43,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(31,61,43,0.1)";
                }}
              >
                <img
                  src={post.images?.[0] || "/noimage.png"}
                  style={img}
                />

                <div style={{ padding: "10px" }}>
                  <p style={postTitle}>{post.title}</p>

                  <small style={user}>
                    {post.userName || "匿名"}
                  </small>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

////////////////////////////////////////////////

// 🌿 スタイル

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
};

const back = {
  color: "#555",
  textDecoration: "none",
};

const titleMain = {
  marginTop: "10px",
  fontSize: "20px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const empty = {
  marginTop: "30px",
  textAlign: "center" as const,
  color: "#777",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginTop: "15px",
};

const card = {
  background: "#fff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 6px 16px rgba(31,61,43,0.1)",
  transition: "0.2s",
};

const img = {
  width: "100%",
  height: "140px",
  objectFit: "cover" as const,
};

const postTitle = {
  fontSize: "14px",
  fontWeight: "bold",
  margin: 0,
};

const user = {
  fontSize: "12px",
  color: "#777",
};