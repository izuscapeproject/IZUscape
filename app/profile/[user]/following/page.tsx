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

export default function FollowingPage() {
  const { user } = useParams();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const q = query(
        collection(db, "follows"),
        where("followerId", "==", user)
      );

      const snap = await getDocs(q);

      const ids = snap.docs.map((d) => d.data().followingId);

      const results = await Promise.all(
        ids.map(async (id: string) => {
          const userSnap = await getDoc(doc(db, "users", id));
          return { id, ...userSnap.data() };
        })
      );

      setUsers(results);
    };

    fetch();
  }, [user]);

  return (
    <main style={{ padding: "20px" }}>
      <Link href={`/profile/${user}`}>←戻る</Link>

      <h2>フォロー中</h2>

      {users.length === 0 ? (
        <p>まだフォローしていません</p>
      ) : (
        users.map((u) => (
          <Link key={u.id} href={`/profile/${u.id}`}>
            <div style={card}>
              <img
                src={u.avatarUrl || "/default.png"}
                style={avatar}
              />
              <div>
                <p>{u.name}</p>
              </div>
            </div>
          </Link>
        ))
      )}
    </main>
  );
}

const card = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const avatar = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  objectFit: "cover" as const,
};