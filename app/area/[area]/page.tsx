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

export default function AreaPage() {
  const params = useParams();
  const area = params.area as string;

  const [posts, setPosts] = useState<any[]>([]);

  const areaMap: any = {
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

  useEffect(() => {
    const fetchPosts = async () => {
      const q = query(
        collection(db, "posts"),
        where("area", "==", area)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setPosts(data);
    };

    fetchPosts();
  }, [area]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>{areaMap[area] || area}</h2>

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