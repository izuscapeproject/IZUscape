"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import PostCard from "@/app/components/PostCard";

export default function TagPage() {
  const params = useParams();
  const tag = decodeURIComponent(params.tag as string);

  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("tags", "array-contains", tag)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(data);
    };

    fetchPosts();
  }, [tag]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>#{tag}</h2>

      <div style={grid}>
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={{
              id: p.id,
              title: p.title,
              imageUrl: p.images?.[0] || "",
              slug: p.slug,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const grid = {
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "10px",
};