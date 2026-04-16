"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Detail() {
  const params = useParams();

  const [post, setPost] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // 🔥 ログイン
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // 🔥 投稿取得
  useEffect(() => {
    const fetchPosts = async () => {
      const snapshot = await getDocs(collection(db, "posts"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const found = data.find(
        (p: any) => String(p.id) === String(params.id)
      );

      setPost(found);
    };

    fetchPosts();
  }, [params.id]);

  // 🔥 保存チェック
  useEffect(() => {
    if (!currentUser || !post) return;

    const checkSaved = async () => {
      const q = query(
        collection(db, "saved"),
        where("userId", "==", currentUser),
        where("postId", "==", post.id)
      );

      const snap = await getDocs(q);
      setIsSaved(!snap.empty);
    };

    checkSaved();
  }, [currentUser, post]);

  // 🔥 保存トグル
  const toggleSave = async () => {
    if (!currentUser) return alert("ログインして");

    const q = query(
      collection(db, "saved"),
      where("userId", "==", currentUser),
      where("postId", "==", post.id)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.forEach(async (d) => await deleteDoc(d.ref));
      setIsSaved(false);
    } else {
      await addDoc(collection(db, "saved"), {
        userId: currentUser,
        postId: post.id,
      });
      setIsSaved(true);
    }
  };

  // 🔥 リアクション
  const handleReaction = async (type: string) => {
    if (!post) return;

    const newReactions = {
      ...post.reactions,
      [type]: (post.reactions?.[type] || 0) + 1,
    };

    await updateDoc(doc(db, "posts", post.id), {
      reactions: newReactions,
    });

    setPost({ ...post, reactions: newReactions });
  };

  if (!post) return <p style={{ padding: "20px" }}>読み込み中...</p>;

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← 戻る
      </Link>

      {/* タイトル */}
      <h2 style={title}>{post.title}</h2>

      {/* 投稿者 */}
      <Link href={`/profile/${post.userId}`} style={userLink}>
        {post.userName || "匿名"}
      </Link>

      {/* 画像＋文章 */}
      {post.images?.map((img: string, i: number) => (
        <div key={i} style={card}>
          <img src={img} style={imgStyle} />
          <p style={text}>{post.contents?.[i]}</p>
        </div>
      ))}

      {/* アクション */}
      <div style={actionRow}>
        <button onClick={toggleSave} style={saveBtn(isSaved)}>
          {isSaved ? "❤️ 保存済み" : "🤍 保存"}
        </button>

        <button onClick={() => handleReaction("scene")} style={reactionBtn}>
          🌄 {post.reactions?.scene || 0}
        </button>
      </div>
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

const title = {
  fontSize: "20px",
  fontWeight: "bold",
  marginTop: "10px",
  color: "#1F3D2B",
};

const userLink = {
  display: "block",
  marginTop: "5px",
  color: "#3E7C59",
  fontSize: "14px",
  textDecoration: "none",
};

const card = {
  marginTop: "15px",
  background: "#fff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 6px 16px rgba(31,61,43,0.1)",
};

const imgStyle = {
  width: "100%",
  height: "200px",
  objectFit: "cover" as const,
};

const text = {
  padding: "10px",
  fontSize: "14px",
};

const actionRow = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const saveBtn = (active: boolean) => ({
  flex: 1,
  padding: "10px",
  borderRadius: "999px",
  border: "none",
  background: active ? "#1F3D2B" : "#eee",
  color: active ? "#fff" : "#333",
  fontWeight: "bold",
});

const reactionBtn = {
  flex: 1,
  padding: "10px",
  borderRadius: "999px",
  border: "none",
  background: "#3E7C59",
  color: "#fff",
};