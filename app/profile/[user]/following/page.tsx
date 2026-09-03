"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

type UserData = {
  id: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
};

export default function FollowingPage() {
  const { user } = useParams();
  const userId = user as string;

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchFollowing = async () => {
      try {
        const q = query(
          collection(db, "follows"),
          where("followerId", "==", userId)
        );

        const snap = await getDocs(q);

        const followingIds = snap.docs.map(
          (d) => d.data().followingId as string
        );

        const results = await Promise.all(
          followingIds.map(async (id) => {
            const userSnap = await getDoc(
              doc(db, "users", id)
            );

            if (!userSnap.exists()) {
              return {
                id,
                name: "ユーザー",
                bio: "",
                avatarUrl: "/default.png",
              };
            }

            return {
              id,
              ...userSnap.data(),
            } as UserData;
          })
        );

        setUsers(results);
      } catch (error) {
        console.error(
          "[IZUscape] フォロー中取得失敗:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  return (
    <main style={container}>

      {/* 戻る */}
      <Link
        href={`/profile/${userId}`}
        style={back}
      >
        ← プロフィール
      </Link>

      {/* タイトル */}
      <div style={header}>
        <h1 style={title}>
          フォロー中
        </h1>

        {!loading && (
          <span style={count}>
            {users.length}人
          </span>
        )}
      </div>

      {/* 読み込み */}
      {loading && (
        <div style={empty}>
          <p style={emptyTitle}>
            読み込み中…
          </p>
        </div>
      )}

      {/* フォローなし */}
      {!loading && users.length === 0 && (
        <div style={empty}>
          <div style={emptyIcon}>
            👤
          </div>

          <p style={emptyTitle}>
            まだフォローしていません
          </p>

          <p style={emptyText}>
            フォローしたユーザーがここに表示されます
          </p>
        </div>
      )}

      {/* ユーザー一覧 */}
      {!loading && users.length > 0 && (
        <section style={list}>
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/profile/${u.id}`}
              style={userLink}
            >
              <article style={userCard}>

                <img
                  src={
                    u.avatarUrl ||
                    "/default.png"
                  }
                  alt=""
                  style={avatar}
                />

                <div style={userInfo}>
                  <p style={name}>
                    {u.name ||
                      "ユーザー"}
                  </p>

                  {u.bio && (
                    <p style={bio}>
                      {u.bio}
                    </p>
                  )}
                </div>

                <span style={arrow}>
                  ›
                </span>

              </article>
            </Link>
          ))}
        </section>
      )}

    </main>
  );
}

// =========================================================
// STYLE
// =========================================================

const container = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "24px 20px 100px",
};

const back = {
  color: "#66736D",
  textDecoration: "none",
  fontSize: "13px",
};

const header = {
  display: "flex",
  alignItems: "baseline",
  gap: "9px",
  marginTop: "22px",
  marginBottom: "15px",
};

const title = {
  margin: 0,
  fontSize: "21px",
  fontWeight: "700",
  color: "#1F3D2B",
};

const count = {
  fontSize: "12px",
  color: "#89938F",
};

const list = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const userLink = {
  textDecoration: "none",
  color: "inherit",
};

const userCard = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
  background: "#fff",
  border: "1px solid #EEF1EF",
  borderRadius: "14px",
};

const avatar = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  objectFit: "cover" as const,
  flexShrink: 0,
};

const userInfo = {
  minWidth: 0,
  flex: 1,
};

const name = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "700",
  color: "#26352E",
};

const bio = {
  margin: "4px 0 0",
  fontSize: "11px",
  color: "#7A8782",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
};

const arrow = {
  fontSize: "22px",
  color: "#A0AAA5",
};

const empty = {
  marginTop: "25px",
  padding: "45px 20px",
  textAlign: "center" as const,
  background: "#FAFBFA",
  borderRadius: "16px",
};

const emptyIcon = {
  fontSize: "28px",
  marginBottom: "10px",
};

const emptyTitle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "700",
  color: "#46544D",
};

const emptyText = {
  margin: "7px 0 0",
  fontSize: "12px",
  color: "#89938F",
};