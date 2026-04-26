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

  // ログイン取得
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid || null);
    });

    return () => unsub();
  }, []);

  // 保存一覧取得
  useEffect(() => {
    if (!userId) return;

    const fetchSaved = async () => {
      const q = query(
        collection(db, "saved"),
        where("userId", "==", userId)
      );

      const savedSnap = await getDocs(q);
      const savedIds = savedSnap.docs.map(
        (doc) => doc.data().postId
      );

      const postSnap = await getDocs(
        collection(db, "posts")
      );

      const posts = postSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const filtered = posts.filter((post: any) =>
        savedIds.includes(post.id)
      );

      setSavedPosts(filtered);
    };

    fetchSaved();
  }, [userId]);

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← ホームに戻る
      </Link>

      <div style={headerArea}>
        <p style={subTitle}>
          あとで行きたい場所
        </p>

        <h1 style={titleMain}>
          保存した体験
        </h1>
      </div>

      {savedPosts.length === 0 ? (
        <div style={emptyBox}>
          <div style={emptyIcon}>
            ❤️
          </div>

          <p style={emptyTitle}>
            まだ保存した体験がありません
          </p>

          <p style={emptyText}>
            気になった旅先や
            行ってみたい体験を
            保存してみよう
          </p>

          <Link href="/" style={homeButton}>
            体験を探しにいく
          </Link>
        </div>
      ) : (
        <>
          <p style={countText}>
            {savedPosts.length}件 保存中
          </p>

          <div style={grid}>
            {savedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/experience/${post.id}`}
                style={linkReset}
              >
                <div
                  style={card}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 24px rgba(31,61,43,0.14)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform =
                      "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(31,61,43,0.08)";
                  }}
                >
                  <div style={imageWrap}>
                    <img
                      src={
                        post.images?.[0] ||
                        "/noimage.png"
                      }
                      alt={post.title}
                      style={img}
                    />

                    <div style={saveBadge}>
                      保存済み
                    </div>
                  </div>

                  <div style={content}>
                    <p style={postTitle}>
                      {post.title}
                    </p>

                    <p style={userName}>
                      by{" "}
                      {post.userName ||
                        "匿名ユーザー"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

////////////////////////////////////////////////

// UI

const container = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "24px",
};

const back = {
  textDecoration: "none",
  color: "#666",
  fontSize: "14px",
  fontWeight: "500",
};

const headerArea = {
  marginTop: "16px",
  marginBottom: "24px",
};

const subTitle = {
  margin: 0,
  fontSize: "13px",
  color: "#6B7A75",
};

const titleMain = {
  margin: "6px 0 0 0",
  fontSize: "30px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const countText = {
  marginBottom: "18px",
  fontSize: "14px",
  color: "#4F5B57",
  fontWeight: "600",
};

const emptyBox = {
  marginTop: "50px",
  background: "#FFFFFF",
  borderRadius: "24px",
  padding: "50px 30px",
  textAlign: "center" as const,
  boxShadow:
    "0 8px 24px rgba(31,61,43,0.06)",
};

const emptyIcon = {
  fontSize: "40px",
  marginBottom: "12px",
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1F3D2B",
  marginBottom: "10px",
};

const emptyText = {
  fontSize: "14px",
  color: "#777",
  lineHeight: 1.8,
  marginBottom: "24px",
};

const homeButton = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: "999px",
  background: "#1F3D2B",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "14px",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
};

const linkReset = {
  textDecoration: "none",
};

const card = {
  background: "#fff",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow:
    "0 6px 16px rgba(31,61,43,0.08)",
  transition: "0.2s",
  cursor: "pointer",
};

const imageWrap = {
  position: "relative" as const,
};

const img = {
  width: "100%",
  height: "180px",
  objectFit: "cover" as const,
};

const saveBadge = {
  position: "absolute" as const,
  top: "12px",
  right: "12px",
  background: "rgba(255,255,255,0.92)",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const content = {
  padding: "16px",
};

const postTitle = {
  margin: 0,
  fontSize: "15px",
  fontWeight: "bold",
  color: "#1F2D2A",
  lineHeight: 1.6,
};

const userName = {
  marginTop: "10px",
  marginBottom: 0,
  fontSize: "13px",
  color: "#7B8782",
};