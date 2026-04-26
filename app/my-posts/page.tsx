"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [loading, setLoading] =
    useState(true);

  // ログイン状態取得
  useEffect(() => {
    const unsub =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        }
      );

    return () => unsub();
  }, []);

  // 自分の投稿取得
  useEffect(() => {
    if (!user) return;

    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where(
          "userId",
          "==",
          user.uid
        )
      );

      const snap =
        await getDocs(q);

      const data = snap.docs.map(
        (doc) => ({
          id: doc.id,
          ...doc.data(),
        })
      );

      setPosts(data);
    };

    fetchPosts();
  }, [user]);

  // 投稿削除
  const handleDelete = async (
    id: string
  ) => {
    const ok = confirm(
      "この投稿を削除しますか？"
    );

    if (!ok) return;

    try {
      await deleteDoc(
        doc(db, "posts", id)
      );

      setPosts((prev) =>
        prev.filter(
          (post) =>
            post.id !== id
        )
      );

      alert(
        "投稿を削除しました"
      );
    } catch (error) {
      console.error(error);
      alert(
        "削除に失敗しました"
      );
    }
  };

  // ローディング
  if (loading) {
    return (
      <p style={center}>
        読み込み中...
      </p>
    );
  }

  // 未ログイン
  if (!user) {
    return (
      <div style={centerBox}>
        <h2 style={emptyTitle}>
          ログインが必要です
        </h2>

        <p style={emptyText}>
          自分の投稿を見るには
          ログインしてください
        </p>

        <Link
          href="/login"
          style={loginBtn}
        >
          ログインする
        </Link>
      </div>
    );
  }

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← ホームに戻る
      </Link>

      <div style={headerArea}>
        <p style={subTitle}>
          あなたの旅の記録
        </p>

        <h1 style={titleMain}>
          自分の投稿
        </h1>
      </div>

      {posts.length === 0 ? (
        <div style={emptyBox}>
          <div style={emptyIcon}>
            ✨
          </div>

          <p style={emptyTitle}>
            まだ投稿がありません
          </p>

          <p style={emptyText}>
            最初の旅の記録を
            投稿してみよう
          </p>

          <Link
            href="/post"
            style={postBtn}
          >
            投稿しにいく
          </Link>
        </div>
      ) : (
        <>
          <p style={countText}>
            {posts.length}件 投稿中
          </p>

          <div style={grid}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={cardWrap}
              >
                <PostCard
                  post={{
                    id: post.id,
                    title:
                      post.title,
                    imageUrl:
                      post.images?.[0] ||
                      "",
                    slug:
                      post.slug,
                  }}
                />

                <div
                  style={
                    actionRow
                  }
                >
                  <Link
                    href={`/edit/${post.id}`}
                    style={
                      editBtn
                    }
                  >
                    編集
                  </Link>

                  <button
                    onClick={() =>
                      handleDelete(
                        post.id
                      )
                    }
                    style={
                      deleteBtn
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
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

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "22px",
};

const cardWrap = {
  display: "flex",
  flexDirection: "column" as const,
};

const actionRow = {
  display: "flex",
  gap: "10px",
  marginTop: "12px",
};

const editBtn = {
  flex: 1,
  textAlign: "center" as const,
  padding: "12px",
  borderRadius: "12px",
  background: "#EAF5EF",
  color: "#1F3D2B",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "14px",
};

const deleteBtn = {
  flex: 1,
  padding: "12px",
  border: "none",
  borderRadius: "12px",
  background: "#FFF2F2",
  color: "#D33",
  fontWeight: "bold",
  fontSize: "14px",
  cursor: "pointer",
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

const postBtn = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: "999px",
  background: "#1F3D2B",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "14px",
};

const loginBtn = {
  display: "inline-block",
  padding: "12px 22px",
  borderRadius: "999px",
  background: "#1F3D2B",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "14px",
};

const center = {
  textAlign: "center" as const,
  marginTop: "40px",
};

const centerBox = {
  marginTop: "80px",
  textAlign: "center" as const,
};