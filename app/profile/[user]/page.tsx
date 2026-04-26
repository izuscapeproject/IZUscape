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
  const [currentUser, setCurrentUser] =
    useState<string | null>(null);
  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followersCount, setFollowersCount] =
    useState(0);
  const [followingCount, setFollowingCount] =
    useState(0);

  // ログイン
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(auth, (user) => {
        setCurrentUser(user?.uid || null);
      });

    return () => unsubscribe();
  }, []);

  // ユーザー取得
  useEffect(() => {
    const fetchUser = async () => {
      const snap = await getDoc(
        doc(db, "users", userId)
      );

      if (snap.exists()) {
        setUserData(snap.data());
      }
    };

    fetchUser();
  }, [userId]);

  // 投稿取得
  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("userId", "==", userId)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(data);
    };

    fetchPosts();
  }, [userId]);

  // フォロー状態
  useEffect(() => {
    if (!currentUser) return;

    const checkFollow = async () => {
      const q = query(
        collection(db, "follows"),
        where(
          "followerId",
          "==",
          currentUser
        ),
        where(
          "followingId",
          "==",
          userId
        )
      );

      const snap = await getDocs(q);
      setIsFollowing(!snap.empty);
    };

    checkFollow();
  }, [currentUser, userId]);

  // フォロー数取得
  useEffect(() => {
    const fetchFollowData = async () => {
      const followerSnap =
        await getDocs(
          query(
            collection(db, "follows"),
            where(
              "followingId",
              "==",
              userId
            )
          )
        );

      setFollowersCount(
        followerSnap.size
      );

      const followingSnap =
        await getDocs(
          query(
            collection(db, "follows"),
            where(
              "followerId",
              "==",
              userId
            )
          )
        );

      setFollowingCount(
        followingSnap.size
      );
    };

    fetchFollowData();
  }, [userId]);

  // フォロー切り替え
  const toggleFollow = async () => {
    if (!currentUser)
      return alert("ログインして");

    if (currentUser === userId)
      return alert(
        "自分はフォローできません"
      );

    const q = query(
      collection(db, "follows"),
      where(
        "followerId",
        "==",
        currentUser
      ),
      where(
        "followingId",
        "==",
        userId
      )
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      snap.forEach(async (d) => {
        await deleteDoc(d.ref);
      });

      setIsFollowing(false);
      setFollowersCount(
        (prev) => prev - 1
      );
    } else {
      await addDoc(
        collection(db, "follows"),
        {
          followerId: currentUser,
          followingId: userId,
        }
      );

      setIsFollowing(true);
      setFollowersCount(
        (prev) => prev + 1
      );
    }
  };

  const isMyProfile =
    currentUser === userId;

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← ホームに戻る
      </Link>

      {/* プロフィール */}
      <div style={profileCard}>
        <img
          src={
            userData?.avatarUrl ||
            "/default.png"
          }
          alt="profile"
          style={avatar}
        />

        <p style={subText}>
          Traveler Profile
        </p>

        <h1 style={name}>
          {userData?.name ||
            "ユーザー"}
        </h1>

        <p style={bio}>
          {userData?.bio ||
            "まだ自己紹介がありません"}
        </p>

        {/* フォロー */}
        <div style={followBox}>
          <Link
            href={`/profile/${userId}/followers`}
            style={followLink}
          >
            <strong>
              {followersCount}
            </strong>
            <span>
              フォロワー
            </span>
          </Link>

          <Link
            href={`/profile/${userId}/following`}
            style={followLink}
          >
            <strong>
              {followingCount}
            </strong>
            <span>
              フォロー中
            </span>
          </Link>

          <div style={followLink}>
            <strong>
              {posts.length}
            </strong>
            <span>投稿</span>
          </div>
        </div>

        {/* ボタン */}
        <div style={buttonArea}>
          {isMyProfile ? (
            <>
              <Link
                href="/profile-edit"
                style={mainBtn}
              >
                プロフィール編集
              </Link>

              <Link
                href="/my-posts"
                style={subBtn}
              >
                自分の投稿
              </Link>
            </>
          ) : (
            <button
              onClick={toggleFollow}
              style={followBtn}
            >
              {isFollowing
                ? "フォロー中"
                : "フォローする"}
            </button>
          )}
        </div>
      </div>

      {/* 投稿一覧 */}
      <div style={sectionHeader}>
        <p style={subText}>
          Journey Records
        </p>

        <h2 style={sectionTitle}>
          投稿一覧
        </h2>
      </div>

      {posts.length === 0 ? (
        <div style={emptyBox}>
          <p style={emptyTitle}>
            まだ投稿がありません
          </p>

          <p style={emptyText}>
            このユーザーの旅の記録は
            まだありません
          </p>
        </div>
      ) : (
        <div style={grid}>
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/experience/${post.id}`}
              style={cardLink}
            >
              <div style={card}>
                <img
                  src={
                    post.images?.[0] ||
                    "/noimage.png"
                  }
                  alt={post.title}
                  style={img}
                />

                <div style={cardContent}>
                  <p style={title}>
                    {post.title}
                  </p>
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

const container = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "24px",
};

const back = {
  textDecoration: "none",
  color: "#666",
  fontSize: "14px",
};

const profileCard = {
  marginTop: "20px",
  textAlign: "center" as const,
  background: "#fff",
  borderRadius: "28px",
  padding: "40px 24px",
  boxShadow:
    "0 8px 24px rgba(31,61,43,0.06)",
};

const avatar = {
  width: "110px",
  height: "110px",
  borderRadius: "50%",
  objectFit: "cover" as const,
};

const subText = {
  marginTop: "14px",
  fontSize: "13px",
  color: "#7A8782",
};

const name = {
  fontSize: "30px",
  fontWeight: "bold",
  color: "#1F3D2B",
  margin: "6px 0",
};

const bio = {
  color: "#666",
  lineHeight: 1.8,
  maxWidth: "520px",
  margin: "0 auto",
};

const followBox = {
  display: "flex",
  justifyContent: "center",
  gap: "30px",
  marginTop: "28px",
  flexWrap: "wrap" as const,
};

const followLink = {
  display: "flex",
  flexDirection: "column" as const,
  textDecoration: "none",
  color: "#1F3D2B",
  fontSize: "14px",
  gap: "4px",
};

const buttonArea = {
  marginTop: "28px",
  display: "flex",
  justifyContent: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const mainBtn = {
  padding: "14px 22px",
  borderRadius: "999px",
  background: "#1F3D2B",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
};

const subBtn = {
  padding: "14px 22px",
  borderRadius: "999px",
  background: "#EAF5EF",
  color: "#1F3D2B",
  textDecoration: "none",
  fontWeight: "bold",
};

const followBtn = {
  padding: "14px 24px",
  borderRadius: "999px",
  border: "none",
  background: "#1F3D2B",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const sectionHeader = {
  marginTop: "50px",
};

const sectionTitle = {
  fontSize: "28px",
  fontWeight: "bold",
  color: "#1F3D2B",
  marginTop: "6px",
};

const emptyBox = {
  marginTop: "24px",
  background: "#fff",
  borderRadius: "24px",
  padding: "40px",
  textAlign: "center" as const,
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "bold",
};

const emptyText = {
  marginTop: "10px",
  color: "#777",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
  marginTop: "24px",
};

const cardLink = {
  textDecoration: "none",
};

const card = {
  background: "#fff",
  borderRadius: "20px",
  overflow: "hidden",
  boxShadow:
    "0 6px 16px rgba(31,61,43,0.08)",
};

const img = {
  width: "100%",
  height: "180px",
  objectFit: "cover" as const,
};

const cardContent = {
  padding: "14px",
};

const title = {
  fontSize: "15px",
  fontWeight: "bold",
  color: "#1F2D2A",
  margin: 0,
};