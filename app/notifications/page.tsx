"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { auth, db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function NotificationsPage() {
  const [userId, setUserId] =
    useState<string | null>(null);

  const [notifications, setNotifications] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  //////////////////////////////////////////////////
  // ログイン取得

  useEffect(() => {
    const unsub =
      onAuthStateChanged(
        auth,
        (user) => {
          setUserId(
            user?.uid || null
          );
          setLoading(false);
        }
      );

    return () => unsub();
  }, []);

  //////////////////////////////////////////////////
  // 通知取得

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications =
      async () => {
        const q = query(
          collection(
            db,
            "notifications"
          ),
          where(
            "targetUserId",
            "==",
            userId
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

        // 新しい順
        data.sort(
          (a: any, b: any) =>
            new Date(
              b.createdAt
            ).getTime() -
            new Date(
              a.createdAt
            ).getTime()
        );

        setNotifications(data);
      };

    fetchNotifications();
  }, [userId]);

  //////////////////////////////////////////////////
  // 既読化

  const markAsRead = async (
    notificationId: string
  ) => {
    try {
      await updateDoc(
        doc(
          db,
          "notifications",
          notificationId
        ),
        {
          isRead: true,
        }
      );

      setNotifications((prev) =>
        prev.map((item) =>
          item.id ===
          notificationId
            ? {
                ...item,
                isRead: true,
              }
            : item
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  //////////////////////////////////////////////////

  if (loading) {
    return (
      <p style={center}>
        読み込み中...
      </p>
    );
  }

  if (!userId) {
    return (
      <div style={emptyBox}>
        <h2 style={emptyTitle}>
          ログインが必要です
        </h2>

        <p style={emptyText}>
          通知を見るには
          ログインしてください
        </p>

        <Link
          href="/login"
          style={mainBtn}
        >
          ログインする
        </Link>
      </div>
    );
  }

  return (
    <main style={container}>
      <Link href="/" style={back}>
        ← ホームに戻る
      </Link>

      <div style={headerArea}>
        <p style={subText}>
          Activity Center
        </p>

        <h1 style={title}>
          通知
        </h1>
      </div>

      {notifications.length === 0 ? (
        <div style={emptyBox}>
          <div style={icon}>
            🔔
          </div>

          <p style={emptyTitle}>
            まだ通知がありません
          </p>

          <p style={emptyText}>
            コメントやフォローがあると
            ここに表示されます
          </p>
        </div>
      ) : (
        <div style={list}>
          {notifications.map(
            (item) => (
              <div
                key={item.id}
                style={{
                  ...card,
                  opacity:
                    item.isRead
                      ? 0.7
                      : 1,
                }}
              >
                <div>
                  <p style={message}>
                    {item.message}
                  </p>

                  <p style={time}>
                    {item.type ===
                    "follow"
                      ? "フォロー通知"
                      : item.type ===
                        "comment"
                      ? "コメント通知"
                      : "保存通知"}
                  </p>
                </div>

                {!item.isRead && (
                  <button
                    onClick={() =>
                      markAsRead(
                        item.id
                      )
                    }
                    style={readBtn}
                  >
                    既読
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </main>
  );
}

////////////////////////////////////////////////
// UI

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

const headerArea = {
  marginTop: "18px",
  marginBottom: "28px",
};

const subText = {
  fontSize: "13px",
  color: "#7A8782",
};

const title = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#1F3D2B",
  marginTop: "6px",
};

const list = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "16px",
};

const card = {
  background: "#fff",
  borderRadius: "20px",
  padding: "22px",
  boxShadow:
    "0 6px 16px rgba(31,61,43,0.06)",
  display: "flex",
  justifyContent:
    "space-between",
  alignItems: "center",
};

const message = {
  fontSize: "15px",
  fontWeight: "600",
  color: "#1F2D2A",
  margin: 0,
};

const time = {
  marginTop: "8px",
  fontSize: "13px",
  color: "#777",
};

const readBtn = {
  padding: "10px 16px",
  borderRadius: "999px",
  border: "none",
  background: "#1F3D2B",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const emptyBox = {
  marginTop: "60px",
  background: "#fff",
  borderRadius: "24px",
  padding: "50px 30px",
  textAlign: "center" as const,
};

const icon = {
  fontSize: "42px",
  marginBottom: "14px",
};

const emptyTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const emptyText = {
  marginTop: "10px",
  color: "#777",
  lineHeight: 1.8,
};

const mainBtn = {
  display: "inline-block",
  marginTop: "20px",
  padding: "12px 22px",
  borderRadius: "999px",
  background: "#1F3D2B",
  color: "#fff",
  textDecoration: "none",
  fontWeight: "bold",
};

const center = {
  textAlign: "center" as const,
  marginTop: "50px",
};