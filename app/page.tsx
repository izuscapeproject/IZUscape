"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const [posts, setPosts] = useState<any[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState<"popular" | "new">("popular");
  const [mode, setMode] = useState<"all" | "follow">("all");

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);

  const router = useRouter();

  // ログイン
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user?.uid || null);
    });
    return () => unsub();
  }, []);

  // 投稿取得
  useEffect(() => {
    const fetchPosts = async () => {
      const snapshot = await getDocs(collection(db, "posts"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(data);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  // 保存取得
  useEffect(() => {
    if (!currentUser) return;

    const fetchSaved = async () => {
      const q = query(
        collection(db, "saved"),
        where("userId", "==", currentUser)
      );

      const snap = await getDocs(q);
      setSavedPosts(snap.docs.map((d) => d.data().postId));
    };

    fetchSaved();
  }, [currentUser]);

  // 保存トグル
  const toggleSave = async (postId: string) => {
    if (!currentUser) return alert("ログインして");

    const q = query(
      collection(db, "saved"),
      where("userId", "==", currentUser),
      where("postId", "==", postId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.forEach(async (d) => await deleteDoc(d.ref));
      setSavedPosts((prev) => prev.filter((id) => id !== postId));
    } else {
      await addDoc(collection(db, "saved"), {
        userId: currentUser,
        postId,
      });
      setSavedPosts((prev) => [...prev, postId]);
    }
  };

  // フィルター
  const followList =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("follow") || "[]")
      : [];

  let filtered = posts.filter((post) => {
    if (mode === "follow" && !followList.includes(post.userId)) return false;
    if (!keyword) return true;
    if (!post.tags) return true;

    return post.tags.some((tag: string) => tag.includes(keyword));
  });

  // 並び替え
  filtered = filtered.sort((a, b) => {
    if (sortType === "new") {
      return (
        new Date(b.createdAt?.seconds * 1000 || 0).getTime() -
        new Date(a.createdAt?.seconds * 1000 || 0).getTime()
      );
    }

    const score = (p: any) =>
      (p.reactions?.scene || 0) +
      (p.reactions?.same || 0) +
      (p.reactions?.nice || 0);

    return score(b) - score(a);
  });

  const handleRandom = () => {
    if (posts.length === 0) return;
    const randomPost = posts[Math.floor(Math.random() * posts.length)];
    router.push(`/experience/${randomPost.id}`);
  };

  return (
    <main style={container}>
      {/* モード */}
      <div style={row}>
        <button style={btn(mode === "all")} onClick={() => setMode("all")}>
          全体
        </button>
        <button style={btn(mode === "follow")} onClick={() => setMode("follow")}>
          フォロー中
        </button>
      </div>

      {/* 検索 */}
      <p style={title}>旅を検索</p>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="雨・夜・静か"
        style={input}
      />

      {/* ランダム */}
      <p style={title}>偶然の旅に出会う</p>

      <div style={hero} onClick={handleRandom}>
        <img src="/teishoku.jpg" style={heroImg} />

        {/* グラデーション */}
        <div style={overlay} />

        {/* テキスト（残して強化） */}
        <div style={heroText}>旅を引く</div>
      </div>

      {/* 並び替え */}
      <div style={row}>
        <button style={btn(sortType === "popular")} onClick={() => setSortType("popular")}>
          人気
        </button>
        <button style={btn(sortType === "new")} onClick={() => setSortType("new")}>
          新着
        </button>
      </div>

      {loading && <p>読み込み中...</p>}

      <div style={grid}>
        {filtered.map((post) => (
          <div
            key={post.id}
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
            <Link href={`/experience/${post.id}`}>
              <div style={{ position: "relative" }}>
                <img src={post.images?.[0]} style={img} />

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleSave(post.id);
                  }}
                  style={saveBtn}
                >
                  {savedPosts.includes(post.id) ? "❤️" : "🤍"}
                </button>
              </div>
            </Link>

            <div style={{ padding: "10px" }}>
              <p style={postTitle}>{post.title}</p>
              <small style={{ color: "#777" }}>
                {post.userName || "匿名"}
              </small>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

///////////////////////////

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
};

const row = {
  display: "flex",
  gap: "10px",
  marginTop: "10px",
};

const btn = (active: boolean) => ({
  flex: 1,
  padding: "8px",
  borderRadius: "10px",
  border: "none",
  background: active ? "#1F3D2B" : "#eee",
  color: active ? "#fff" : "#333",
});

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #ccc",
};

const hero = {
  position: "relative" as const,
  marginTop: "10px",
  borderRadius: "15px",
  overflow: "hidden",
};

const heroImg = {
  width: "100%",
  height: "180px",
  objectFit: "cover" as const,
};

const overlay = {
  position: "absolute" as const,
  bottom: 0,
  width: "100%",
  height: "50%",
  background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
};

const heroText = {
  position: "absolute" as const,
  bottom: "12px",
  left: "12px",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "18px",
  textShadow: "0 2px 6px rgba(0,0,0,0.6)",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
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

const saveBtn = {
  position: "absolute" as const,
  top: "8px",
  right: "8px",
  background: "#fff",
  borderRadius: "50%",
  width: "32px",
  height: "32px",
  border: "none",
};

const postTitle = {
  fontSize: "14px",
  fontWeight: "bold",
};

const title = {
  marginTop: "20px",
  fontWeight: "bold",
  color: "#1F3D2B",
};