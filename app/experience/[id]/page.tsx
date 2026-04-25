// app/experience/[id]/page.tsx
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
  deleteDoc as removeDoc,
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

  // 🔐 ログイン状態取得
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
        ? {
            id: snap.docs[0].id,
            ...snap.docs[0].data(),
          }
        : null;

      setPost(found);
    };

    fetchPost();
  }, [params.id]);

  // 🔖 保存状態チェック
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

  // ❤️ 保存トグル
  const toggleSave = async () => {
    if (!currentUser) return alert("ログインして");

    const q = query(
      collection(db, "saved"),
      where("userId", "==", currentUser),
      where("postId", "==", post.id)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.forEach(async (d) => {
        await deleteDoc(d.ref);
      });

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

    setPost({
      ...post,
      reactions: newReactions,
    });
  };

  // 🗑 投稿削除（自分の投稿のみ）
  const handleDelete = async () => {
    if (!post) return;

    const ok = confirm("この投稿を削除しますか？");
    if (!ok) return;

    try {
      await removeDoc(doc(db, "posts", post.id));

      alert("投稿を削除しました");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    }
  };

  // 🔥 関連投稿
  useEffect(() => {
    if (!post?.area) return;

    const fetchRelated = async () => {
      const data = await getRelatedPosts(post.area);

      const filtered = data.filter(
        (p: any) => p.id !== post.id
      );

      setRelatedPosts(filtered);
    };

    fetchRelated();
  }, [post]);

  if (!post) {
    return (
      <p style={{ padding: "20px" }}>
        読み込み中...
      </p>
    );
  }

  // エリア変換
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

  const isOwner = currentUser === post.userId;

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← 戻る
      </Link>

      {/* ヒーロー画像 */}
      <img
        src={post.images?.[0]}
        alt={post.title}
        style={hero}
      />

      {/* タイトル */}
      <h2 style={title}>
        {post.title}
      </h2>

      {/* エリア・投稿者 */}
      <p style={meta}>
        <Link
          href={`/area/${post.area}`}
          style={areaLink}
        >
          📍 {areaMap[post.area] || post.area}
        </Link>
        ・ {post.userName || "匿名"}
      </p>

      {/* タグ */}
      <div style={tags}>
        {post.tags?.map(
          (tag: string, i: number) => (
            <Link
              key={i}
              href={`/tag/${encodeURIComponent(tag)}`}
            >
              <span style={tagStyle}>
                #{tag}
              </span>
            </Link>
          )
        )}
      </div>

      {/* 導入文 */}
      <div style={summaryCard}>
        <p style={summary}>
          {post.contents?.[0]}
        </p>
      </div>

      {/* スポット */}
      {post.images
        ?.slice(1)
        .map((img: string, i: number) => (
          <div key={i} style={spotCard}>
            <h3 style={spotTitle}>
              📍{" "}
              {post.spotNames?.[i] ||
                `スポット ${i + 1}`}
            </h3>

            <img
              src={img}
              alt={`spot-${i}`}
              style={imgStyle}
            />

            <p style={text}>
              {post.contents?.[i + 1] || ""}
            </p>
          </div>
        ))}

      {/* ルート */}
      <div style={routeBox}>
        <h3 style={routeTitle}>
          🗺 ルート
        </h3>

        <p style={routeText}>
          {(post.spotNames || [])
            .map(
              (name: string) =>
                name || "スポット"
            )
            .join(" → ")}
        </p>
      </div>

      {/* アクション */}
      <div style={actionRow}>
        <button
          onClick={toggleSave}
          style={saveBtn(isSaved)}
        >
          {isSaved
            ? "❤️ 保存済み"
            : "🤍 保存"}
        </button>

        <button
          onClick={() =>
            handleReaction("want")
          }
          style={reactionBtn}
        >
          行ってみたい{" "}
          {post.reactions?.want || 0}
        </button>

        <button
          onClick={() =>
            handleReaction("same")
          }
          style={reactionBtn}
        >
          同じ体験{" "}
          {post.reactions?.same || 0}
        </button>

        <button
          onClick={() =>
            handleReaction("nice")
          }
          style={reactionBtn}
        >
          素敵{" "}
          {post.reactions?.nice || 0}
        </button>
      </div>

      {/* 自分の投稿のみ */}
      {isOwner && (
        <div style={ownerActions}>
          <Link
            href={`/edit/${post.id}`}
            style={editBtn}
          >
            ✏️ 編集する
          </Link>

          <button
            onClick={handleDelete}
            style={deleteBtn}
          >
            🗑 削除する
          </button>
        </div>
      )}

      {/* 関連投稿 */}
      <h3 style={relatedTitle}>
        こんなのもあるよ
      </h3>

      <div style={relatedRow}>
        {relatedPosts.map((p) => (
          <PostCard
            key={p.id}
            post={{
              id: p.id,
              title: p.title,
              imageUrl:
                p.images?.[0] || "",
              slug: p.slug,
            }}
          />
        ))}
      </div>
    </main>
  );
}

////////////////////////////////////////////////

const container = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "24px",
};

const back = {
  color: "#666",
  textDecoration: "none",
  fontSize: "14px",
};

const hero = {
  width: "100%",
  height: "260px",
  objectFit: "cover" as const,
  borderRadius: "18px",
  marginTop: "12px",
};

const title = {
  fontSize: "24px",
  fontWeight: "bold",
  marginTop: "16px",
  lineHeight: "1.4",
};

const meta = {
  marginTop: "8px",
  fontSize: "14px",
};

const areaLink = {
  color: "#2E7D5A",
  textDecoration: "none",
  fontWeight: "600",
};

const tags = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "8px",
  marginTop: "14px",
};

const tagStyle = {
  background: "#E8F3EE",
  color: "#2E7D5A",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: "500",
};

const summaryCard = {
  marginTop: "24px",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "22px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
};

const summary = {
  fontSize: "15px",
  lineHeight: "1.9",
  color: "#333",
};

const spotCard = {
  marginTop: "24px",
  background: "#ffffff",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
};

const spotTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "14px",
};

const imgStyle = {
  width: "100%",
  borderRadius: "14px",
};

const text = {
  marginTop: "14px",
  fontSize: "15px",
  lineHeight: "1.9",
  color: "#333",
};

const routeBox = {
  marginTop: "28px",
  background: "#F4FAF7",
  borderRadius: "18px",
  padding: "20px",
};

const routeTitle = {
  fontSize: "18px",
  fontWeight: "bold",
};

const routeText = {
  marginTop: "10px",
  lineHeight: "1.8",
};

const actionRow = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "12px",
  marginTop: "28px",
};

const saveBtn = (active: boolean) => ({
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  background: active ? "#2E7D5A" : "#eee",
  color: active ? "#fff" : "#333",
  fontWeight: "bold",
});

const reactionBtn = {
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  background: "#2E7D5A",
  color: "#fff",
  fontWeight: "bold",
};

const ownerActions = {
  display: "flex",
  gap: "12px",
  marginTop: "24px",
};

const editBtn = {
  padding: "12px 18px",
  borderRadius: "999px",
  background: "#F0F7F4",
  color: "#2E7D5A",
  textDecoration: "none",
  fontWeight: "bold",
};

const deleteBtn = {
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  background: "#FFEAEA",
  color: "#D33",
  fontWeight: "bold",
};

const relatedTitle = {
  marginTop: "40px",
  fontSize: "20px",
  fontWeight: "bold",
};

const relatedRow = {
  display: "flex",
  gap: "14px",
  overflowX: "auto" as const,
  paddingTop: "12px",
};