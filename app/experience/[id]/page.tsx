// app/experience/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function DetailPage() {
  const params = useParams();

  // undefined対策
  const postId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const [post, setPost] = useState<any>(null);
  const [currentUser, setCurrentUser] =
    useState<string | null>(null);
  const [isSaved, setIsSaved] =
    useState(false);

  const [comments, setComments] =
    useState<any[]>([]);
  const [commentText, setCommentText] =
    useState("");

  //////////////////////////////////////////////////
  // ログイン取得

  useEffect(() => {
    const unsub =
      onAuthStateChanged(auth, (user) => {
        setCurrentUser(user?.uid || null);
      });

    return () => unsub();
  }, []);

  //////////////////////////////////////////////////
  // 投稿取得

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        // docID検索
        const ref = doc(
          db,
          "posts",
          String(postId)
        );

        const snap =
          await getDoc(ref);

        if (snap.exists()) {
          setPost({
            id: snap.id,
            ...snap.data(),
          });
          return;
        }

        // slug検索
        const q = query(
          collection(db, "posts"),
          where(
            "slug",
            "==",
            String(postId)
          )
        );

        const slugSnap =
          await getDocs(q);

        if (!slugSnap.empty) {
          setPost({
            id: slugSnap.docs[0].id,
            ...slugSnap.docs[0].data(),
          });
          return;
        }

        alert("投稿が見つかりません");
      } catch (error) {
        console.error(error);
      }
    };

    fetchPost();
  }, [postId]);

  //////////////////////////////////////////////////
  // 保存状態確認

  useEffect(() => {
    if (
      !currentUser ||
      !post ||
      !post.id
    )
      return;

    const checkSaved = async () => {
      const q = query(
        collection(db, "saved"),
        where(
          "userId",
          "==",
          String(currentUser)
        ),
        where(
          "postId",
          "==",
          String(post.id)
        )
      );

      const snap =
        await getDocs(q);

      setIsSaved(!snap.empty);
    };

    checkSaved();
  }, [currentUser, post]);

  //////////////////////////////////////////////////
  // コメント取得

  useEffect(() => {
    if (!post || !post.id) return;

    const fetchComments = async () => {
      const q = query(
        collection(db, "comments"),
        where(
          "postId",
          "==",
          String(post.id)
        ),
        orderBy(
          "createdAt",
          "desc"
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

      setComments(data);
    };

    fetchComments();
  }, [post]);

  //////////////////////////////////////////////////
  // 保存切替

  const toggleSave = async () => {
    if (!currentUser)
      return alert("ログインして");

    if (!post || !post.id) return;

    const q = query(
      collection(db, "saved"),
      where(
        "userId",
        "==",
        String(currentUser)
      ),
      where(
        "postId",
        "==",
        String(post.id)
      )
    );

    const snap =
      await getDocs(q);

    if (!snap.empty) {
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }

      setIsSaved(false);
    } else {
      await addDoc(
        collection(db, "saved"),
        {
          userId: String(
            currentUser
          ),
          postId: String(post.id),
        }
      );

      setIsSaved(true);
    }
  };

  //////////////////////////////////////////////////
  // リアクション（1人1回）

  const handleReaction = async (
    type: string
  ) => {
    if (!currentUser) {
      alert("ログインして");
      return;
    }

    if (!post || !post.id) return;

    try {
      const q = query(
        collection(db, "reactions"),
        where(
          "userId",
          "==",
          String(currentUser)
        ),
        where(
          "postId",
          "==",
          String(post.id)
        ),
        where(
          "type",
          "==",
          type
        )
      );

      const snap =
        await getDocs(q);

      if (!snap.empty) {
        alert(
          "すでにリアクション済みです"
        );
        return;
      }

      await addDoc(
        collection(db, "reactions"),
        {
          userId: String(
            currentUser
          ),
          postId: String(post.id),
          type,
          createdAt: Date.now(),
        }
      );

      const newReactions = {
        ...post.reactions,
        [type]:
          (post.reactions?.[
            type
          ] || 0) + 1,
      };

      await updateDoc(
        doc(db, "posts", post.id),
        {
          reactions:
            newReactions,
        }
      );

      setPost({
        ...post,
        reactions:
          newReactions,
      });
    } catch (error) {
      console.error(error);
      alert(
        "リアクションに失敗しました"
      );
    }
  };

  //////////////////////////////////////////////////
  // コメント送信

  const handleCommentSubmit =
    async () => {
      if (!currentUser)
        return alert(
          "ログインして"
        );

      if (!post || !post.id)
        return;

      if (!commentText.trim())
        return alert(
          "コメントを入力して"
        );

      await addDoc(
        collection(db, "comments"),
        {
          postId: String(post.id),
          userId: String(
            currentUser
          ),
          userName:
            auth.currentUser
              ?.displayName ||
            "匿名",
          text: commentText,
          createdAt:
            Date.now(),
        }
      );

      setCommentText("");

      const q = query(
        collection(db, "comments"),
        where(
          "postId",
          "==",
          String(post.id)
        ),
        orderBy(
          "createdAt",
          "desc"
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

      setComments(data);
    };

  //////////////////////////////////////////////////
  // コメント削除

  const handleDeleteComment =
    async (id: string) => {
      const ok = confirm(
        "コメントを削除しますか？"
      );

      if (!ok) return;

      await deleteDoc(
        doc(db, "comments", id)
      );

      setComments((prev) =>
        prev.filter(
          (c) => c.id !== id
        )
      );
    };

  //////////////////////////////////////////////////

  if (!post) {
    return (
      <main
        style={{
          padding: "30px",
        }}
      >
        読み込み中...
      </main>
    );
  }

  return (
    <main style={container}>
      <Link
        href="/"
        style={back}
      >
        ← 戻る
      </Link>

      <img
        src={
          post.images?.[0] ||
          "/noimage.png"
        }
        alt={post.title}
        style={heroImage}
      />

      <h1 style={title}>
        {post.title}
      </h1>

      {/* スポット表示 */}
      <p style={spotText}>
        📍{" "}
        {post.spot ||
          post.place ||
          post.location ||
          post.spotNames?.[0] ||
          "スポット未設定"}
      </p>

      <p style={userName}>
        投稿者：
        {post.userName ||
          "匿名"}
      </p>

      <p style={description}>
        {post.description ||
          post.contents?.[0] ||
          "説明なし"}
      </p>

      <button
        onClick={toggleSave}
        style={saveBtn}
      >
        {isSaved
          ? "❤️ 保存済み"
          : "🤍 保存する"}
      </button>

      <div style={reactionBox}>
        <button
          onClick={() =>
            handleReaction(
              "like"
            )
          }
        >
          👍{" "}
          {post.reactions
            ?.like || 0}
        </button>

        <button
          onClick={() =>
            handleReaction(
              "want"
            )
          }
        >
          行きたい{" "}
          {post.reactions
            ?.want || 0}
        </button>

        <button
          onClick={() =>
            handleReaction(
              "amazing"
            )
          }
        >
          すごい{" "}
          {post.reactions
            ?.amazing || 0}
        </button>
      </div>

      <div style={commentBox}>
        <h2>コメント</h2>

        <textarea
          value={commentText}
          onChange={(e) =>
            setCommentText(
              e.target.value
            )
          }
          style={textarea}
          placeholder="コメントを書く"
        />

        <button
          onClick={
            handleCommentSubmit
          }
          style={commentBtn}
        >
          コメントする
        </button>

        {comments.map(
          (comment) => (
            <div
              key={comment.id}
              style={commentCard}
            >
              <strong>
                {comment.userName ||
                  "匿名"}
              </strong>

              <p>
                {comment.text}
              </p>

              {currentUser ===
                comment.userId && (
                <button
                  onClick={() =>
                    handleDeleteComment(
                      comment.id
                    )
                  }
                >
                  削除
                </button>
              )}
            </div>
          )
        )}
      </div>
    </main>
  );
}

//////////////////////////////////////////////////
// style

const container = {
  maxWidth: "800px",
  margin: "0 auto",
  padding: "20px",
};

const back = {
  textDecoration: "none",
  color: "#555",
};

const heroImage = {
  width: "100%",
  height: "300px",
  objectFit: "cover" as const,
  borderRadius: "20px",
  marginTop: "20px",
};

const title = {
  marginTop: "20px",
  fontSize: "28px",
  fontWeight: "bold",
};

const spotText = {
  marginTop: "10px",
  fontSize: "15px",
  color: "#666",
};

const userName = {
  marginTop: "10px",
  color: "#666",
};

const description = {
  marginTop: "20px",
  lineHeight: 1.8,
};

const saveBtn = {
  marginTop: "20px",
};

const reactionBox = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const commentBox = {
  marginTop: "40px",
};

const textarea = {
  width: "100%",
  minHeight: "100px",
};

const commentBtn = {
  marginTop: "10px",
};

const commentCard = {
  marginTop: "20px",
  padding: "15px",
  border: "1px solid #ddd",
  borderRadius: "12px",
};