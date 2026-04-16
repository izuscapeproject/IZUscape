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

export default function FollowersPage() {
  const { user } = useParams();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowers = async () => {
      try {
        // 🔥 フォロワー取得
        const q = query(
          collection(db, "follows"),
          where("followingId", "==", user)
        );

        const snap = await getDocs(q);

        const followerIds = snap.docs.map(
          (d) => d.data().followerId
        );

        // 🔥 ユーザー情報取得
        const results = await Promise.all(
          followerIds.map(async (id: string) => {
            const userSnap = await getDoc(doc(db, "users", id));

            if (userSnap.exists()) {
              return { id, ...userSnap.data() };
            } else {
              return { id, name: "ユーザー", avatarUrl: "/default.png" };
            }
          })
        );

        setUsers(results);
      } catch (e) {
        console.error(e);
      }

      setLoading(false);
    };

    fetchFollowers();
  }, [user]);

  return (
    <main style={container}>
      <Link href={`/profile/${user}`} style={back}>
        ← 戻る
      </Link>

      <h2 style={title}>フォロワー</h2>

      {loading && <p>読み込み中...</p>}

      {!loading && users.length === 0 && (
        <div style={empty}>
          <p>フォロワーがいません</p>
          <small>ここにフォロワーが表示されます</small>
        </div>
      )}

      <div>
        {users.map((u) => (
          <Link key={u.id} href={`/profile/${u.id}`}>
            <div style={card}>
              <img
                src={u.avatarUrl || "/default.png"}
                style={avatar}
              />

              <div>
                <p style={name}>{u.name}</p>
              </div>
            </div>
          </Link>
        ))}
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
  marginTop: "10px",
  fontSize: "20px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const empty = {
  marginTop: "30px",
  textAlign: "center" as const,
  color: "#777",
};

const card = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px",
  borderBottom: "1px solid #eee",
  transition: "0.2s",
};

const avatar = {
  width: "45px",
  height: "45px",
  borderRadius: "50%",
  objectFit: "cover" as const,
};

const name = {
  fontSize: "14px",
  fontWeight: "bold",
};