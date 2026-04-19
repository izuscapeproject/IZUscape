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

import PostCard from "@/app/components/PostCard";
import { getRelatedPosts } from "@/lib/getRelatedPosts";

export default function Detail() {
  const params = useParams();

  const [post, setPost] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  // 🔐 ログイン
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // 🔥 投稿取得（slug）
  useEffect(() => {
    const fetchPost = async () => {
      if (!params.id) return;

      const q = query(
        collection(db, "posts"),
        where("slug", "==", params.id)
      );

      const snap = await getDocs(q);

      const found = snap.docs[0]
        ? { id: snap.docs[0].id, ...snap.docs[0].data() }
        : null;

      setPost(found);
    };

    fetchPost();
  }, [params.id]);

  // 🔖 保存チェック
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

  // ❤️ 保存
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

  // 👍 リアクション
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

  // 🔥 関連投稿
  useEffect(() => {
    if (!post?.area) return;

    const fetchRelated = async () => {
      const data = await getRelatedPosts(post.area);
      const filtered = data.filter((p: any) => p.id !== post.id);
      setRelatedPosts(filtered);
    };

    fetchRelated();
  }, [post]);

  if (!post) return <p style={{ padding: "20px" }}>読み込み中...</p>;

  // 🔥 エリア変換
  const areaMap: Record<string, string> = {
    shimoda: "下田市",
    atami: "熱海市",
    ito: "伊東市",
    izu: "伊豆市",
    izunokuni: "伊豆の国市",
    higashiizu: "東伊豆町",
    kawazu: "河津町",
    minamiizu: "南伊豆町",
    matsuzaki: "松崎町",
    nishiizu: "西伊豆町",
    kannami: "函南町",
    mishima: "三島市",
    numazu: "沼津市",
  };

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← 戻る
      </Link>

      {/* ヒーロー */}
      <img src={post.images?.[0]} style={hero} />

      {/* タイトル */}
      <h2 style={title}>{post.title}</h2>

      {/* エリア・ユーザー */}
      <p style={meta}>
        <Link href={`/area/${post.area}`} style={areaLink}>
          📍 {areaMap[post.area] || post.area}
        </Link>
        ・ {post.userName || "匿名"}
      </p>

      {/* タグ */}
      <div style={tags}>
        {post.tags?.map((tag: string, i: number) => (
          <Link key={i} href={`/tag/${encodeURIComponent(tag)}`}>
            <span style={tagStyle}>#{tag}</span>
          </Link>
        ))}
      </div>

      {/* 導入 */}
      <p style={summary}>{post.contents?.[0]}</p>

      <hr />

      {/* スポット */}
      {post.images?.slice(1).map((img: string, i: number) => (
        <div key={i} style={section}>
          <h4 style={spotTitle}>
            📍 {post.spotNames?.[i] || `スポット ${i + 1}`}
          </h4>

          <img src={img} style={imgStyle} />

          <p style={text}>{post.contents?.[i + 1] || ""}</p>
        </div>
      ))}

      {/* ルート */}
      <div style={routeBox}>
        <h3>🗺 ルート</h3>
        <p>
          {(post.spotNames || [])
            .map((n: string) => n || "スポット")
            .join(" → ")}
        </p>
      </div>

      {/* アクション */}
      <div style={actionRow}>
        <button onClick={toggleSave} style={saveBtn(isSaved)}>
          {isSaved ? "❤️ 保存済み" : "🤍 保存"}
        </button>

        <button onClick={() => handleReaction("want")} style={reactionBtn}>
          行ってみたい {post.reactions?.want || 0}
        </button>

        <button onClick={() => handleReaction("same")} style={reactionBtn}>
          同じ体験 {post.reactions?.same || 0}
        </button>

        <button onClick={() => handleReaction("nice")} style={reactionBtn}>
          👍 {post.reactions?.nice || 0}
        </button>
      </div>

      {/* 関連 */}
      <h3 style={{ marginTop: "30px" }}>こんなのもあるよ</h3>

      <div style={relatedRow}>
        {relatedPosts.map((p) => (
          <PostCard
            key={p.id}
            post={{
              id: p.id,
              title: p.title,
              imageUrl: p.images?.[0] || "",
              slug: p.slug,
            }}
          />
        ))}
      </div>
    </main>
  );
}

////////////////////////////////////////////////

// 🎨 スタイル（全部エラー対策済）

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "24px",
};

const back = {
  color: "#555",
  textDecoration: "none",
};

const hero = {
  width: "100%",
  height: "240px",
  objectFit: "cover" as const,
  borderRadius: "16px",
};

const title = {
  fontSize: "20px",
  marginTop: "10px",
};

const meta = {
  fontSize: "14px",
};

const areaLink = {
  color: "#2E7D5A",
  textDecoration: "none",
};

const tags = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap" as const,
};

const tagStyle = {
  background: "#E8F3EE",
  padding: "4px 10px",
  borderRadius: "999px",
  color: "#2E7D5A",
};

const summary = {
  marginTop: "10px",
};

const section = {
  marginTop: "20px",
};

const spotTitle = {
  fontSize: "14px",
};

const imgStyle = {
  width: "100%",
  borderRadius: "12px",
};

const text = {
  fontSize: "14px",
};

const routeBox = {
  marginTop: "20px",
  padding: "12px",
  background: "#F0F7F4",
  borderRadius: "10px",
};

const actionRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const saveBtn = (active: boolean) => ({
  flex: 1,
  padding: "10px",
  borderRadius: "999px",
  background: active ? "#2E7D5A" : "#eee",
  color: active ? "#fff" : "#333",
});

const reactionBtn = {
  flex: 1,
  padding: "10px",
  borderRadius: "999px",
  background: "#2E7D5A",
  color: "#fff",
};

const relatedRow = {
  display: "flex",
  gap: "10px",
  overflowX: "auto" as const,
};