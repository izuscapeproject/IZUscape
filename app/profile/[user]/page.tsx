"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function Profile() {
  const params = useParams();
  const userId = params.user as string;

  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // 🔥 ログイン
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  // 🔥 ユーザー取得
  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) setUserData(snap.data());
    };
    fetchUser();
  }, [userId]);

  // 🔥 投稿取得
  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(collection(db, "posts"), where("userId", "==", userId));
      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(data);
    };

    fetchPosts();
  }, [userId]);

  // 🔥 フォロー状態
  useEffect(() => {
    if (!currentUser) return;

    const checkFollow = async () => {
      const q = query(
        collection(db, "follows"),
        where("followerId", "==", currentUser),
        where("followingId", "==", userId)
      );

      const snap = await getDocs(q);
      setIsFollowing(!snap.empty);
    };

    checkFollow();
  }, [currentUser, userId]);

  // 🔥 フォロー数取得
  useEffect(() => {
    const fetchFollowData = async () => {
      const followerSnap = await getDocs(
        query(collection(db, "follows"), where("followingId", "==", userId))
      );
      setFollowersCount(followerSnap.size);

      const followingSnap = await getDocs(
        query(collection(db, "follows"), where("followerId", "==", userId))
      );
      setFollowingCount(followingSnap.size);
    };

    fetchFollowData();
  }, [userId]);

  // 🔥 フォロー切り替え
  const toggleFollow = async () => {
    if (!currentUser) return alert("ログインして");
    if (currentUser === userId) return alert("自分はフォロー不可");

    const q = query(
      collection(db, "follows"),
      where("followerId", "==", currentUser),
      where("followingId", "==", userId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.forEach(async (d) => await deleteDoc(d.ref));
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
    } else {
      await addDoc(collection(db, "follows"), {
        followerId: currentUser,
        followingId: userId,
      });
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    }
  };

  const isMyProfile = currentUser === userId;

  return (
    <main style={container}>
      <Link href="/" style={back}>← 戻る</Link>

      {/* 👤 ユーザー */}
      <div style={profileCard}>
        <img
          src={userData?.avatarUrl || "/default.png"}
          style={avatar}
        />

        <h2>{userData?.name || "ユーザー"}</h2>
        <p style={{ color: "#777" }}>
          {userData?.bio || "自己紹介なし"}
        </p>

        {/* 🔥 フォロー情報 */}
        <div style={followRow}>
          <Link href={`/profile/${userId}/followers`}>
            フォロワー {followersCount}
          </Link>
          <Link href={`/profile/${userId}/following`}>
            フォロー中 {followingCount}
          </Link>
        </div>

        {/* 🔥 ボタン */}
        {isMyProfile ? (
          <Link href="/profile-edit">
            <button style={btn}>プロフィール編集</button>
          </Link>
        ) : (
          <button onClick={toggleFollow} style={btn}>
            {isFollowing ? "フォロー中" : "フォロー"}
          </button>
        )}
      </div>

      {/* 投稿 */}
      <h3 style={sectionTitle}>投稿</h3>

      {posts.length === 0 ? (
        <p style={{ color: "#999" }}>投稿がありません</p>
      ) : (
        <div style={grid}>
          {posts.map((post) => (
            <Link key={post.id} href={`/experience/${post.id}`}>
              <div
                style={card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <img src={post.images?.[0]} style={img} />
                <p style={title}>{post.title}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

////////////////////////////////////////////////

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "20px",
};

const back = {
  color: "#555",
  textDecoration: "none",
};

const profileCard = {
  marginTop: "10px",
  textAlign: "center" as const,
};

const avatar = {
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  objectFit: "cover" as const,
};

const followRow = {
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  marginTop: "10px",
  color: "#1F3D2B",
  fontWeight: "bold",
};

const btn = {
  marginTop: "10px",
  padding: "8px 16px",
  borderRadius: "20px",
  border: "none",
  background: "#1F3D2B",
  color: "#fff",
};

const sectionTitle = {
  marginTop: "20px",
  color: "#1F3D2B",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
  marginTop: "10px",
};

const card = {
  background: "#fff",
  borderRadius: "12px",
  overflow: "hidden",
  transition: "0.2s",
};

const img = {
  width: "100%",
  height: "120px",
  objectFit: "cover" as const,
};

const title = {
  fontSize: "14px",
  fontWeight: "bold",
  padding: "8px",
};