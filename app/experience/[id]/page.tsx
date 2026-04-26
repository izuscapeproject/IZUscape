"use client";

import { useParams, useRouter } from "next/navigation";
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
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  // ログイン状態取得
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user?.uid || null);
    });

    return () => unsub();
  }, []);

  // 投稿取得（slug）
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

  // 保存状態チェック
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

  // 保存トグル
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

  // リアクション
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

  // 削除
  const handleDelete = async () => {
    const ok = confirm("この投稿を削除しますか？");

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "posts", post.id));

      alert("投稿を削除しました");
      router.push("/");
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    }
  };

  // 関連投稿
  useEffect(() => {
    if (!post?.area) return;

    const fetchRelated = async () => {
      const data = await getRelatedPosts(post.area);
      const filtered = data.filter((p: any) => p.id !== post.id);

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

  // 自分の投稿か判定
  const isOwner = currentUser === post.userId;

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
      <img
        src={post.images?.[0]}
        style={hero}
      />

      {/* タイトル */}
      <h2 style={title}>
        {post.title}
      </h2>

      {/* エリア・ユーザー */}
      <p style={meta}>
        📍{" "}
        {areaMap[post.area] || post.area}
        ・{" "}
        {post.userName || "匿名"}
      </p>

      {/* タグ */}
      <div style={tags}>
        {post.tags?.map(
          (tag: string, i: number) => (
            <span
              key={i}
              style={tagStyle}
            >
              #{tag}
            </span>
          )
        )}
      </div>

      {/* 導入 */}
      <p style={summary}>
        {post.contents?.[0]}
      </p>

      <hr />

      {/* スポット */}
      {post.images
        ?.slice(1)
        .map((img: string, i: number) => (
          <div
            key={i}
            style={section}
          >
            <h4 style={spotTitle}>
              📍{" "}
              {post.spotNames?.[i] ||
                `スポット ${i + 1}`}
            </h4>

            <img
              src={img}
              style={imgStyle}
            />

            <p style={text}>
              {post.contents?.[i + 1] ||
                ""}
            </p>
          </div>
        ))}

      {/* ルート */}
      <div style={routeBox}>
        <h3>🗺 ルート</h3>
        <p>
          {(post.spotNames || [])
            .map(
              (n: string) =>
                n || "スポット"
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

      {/* 自分の投稿だけ */}
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
};

const hero = {
  width: "100%",
  height: "260px",
  objectFit: "cover" as const,
  borderRadius: "18px",
  marginTop: "12px",
};

const title = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "18px",
};

const meta = {
  color: "#666",
  marginTop: "8px",
};

const tags = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  marginTop: "16px",
};

const tagStyle = {
  background: "#EEF7F1",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "13px",
};

const summary = {
  marginTop: "20px",
  lineHeight: 1.8,
};

const section = {
  marginTop: "30px",
};

const spotTitle = {
  fontSize: "18px",
  fontWeight: "bold",
};

const imgStyle = {
  width: "100%",
  borderRadius: "14px",
  marginTop: "10px",
};

const text = {
  marginTop: "14px",
  lineHeight: 1.8,
};

const routeBox = {
  marginTop: "30px",
  padding: "20px",
  background: "#F7FAF8",
  borderRadius: "16px",
};

const actionRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
  marginTop: "30px",
};

const saveBtn = (saved: boolean) => ({
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  background: saved
    ? "#1F3D2B"
    : "#EAF5EF",
  color: saved ? "#fff" : "#1F3D2B",
  cursor: "pointer",
});

const reactionBtn = {
  padding: "12px 18px",
  borderRadius: "999px",
  border: "none",
  background: "#F3F5F4",
  cursor: "pointer",
};

const ownerActions = {
  display: "flex",
  gap: "12px",
  marginTop: "30px",
};

const editBtn = {
  padding: "14px 20px",
  background: "#2E7D5A",
  color: "#fff",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: "bold",
};

const deleteBtn = {
  padding: "14px 20px",
  background: "#fff0f0",
  color: "#d33",
  border: "none",
  borderRadius: "999px",
  fontWeight: "bold",
  cursor: "pointer",
};

const relatedTitle = {
  marginTop: "40px",
};

const relatedRow = {
  display: "flex",
  gap: "14px",
  overflowX: "auto" as const,
  marginTop: "16px",
};