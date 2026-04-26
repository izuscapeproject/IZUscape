import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

type ParamsType = {
  id: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<ParamsType>;
}) {
  // 🔥 Next.js 16 対応
  const resolvedParams = await params;

  // 🔥 undefined 完全対策
  const postId =
    typeof resolvedParams?.id === "string"
      ? resolvedParams.id
      : null;

  // 🔥 id がない時は即 return
  if (!postId) {
    return {
      title: "IZUscape",
      description:
        "偶然の出会いを楽しむ旅アプリ",
    };
  }

  try {
    const q = query(
      collection(db, "posts"),
      where(
        "slug",
        "==",
        String(postId)
      )
    );

    const snap =
      await getDocs(q);

    const post =
      snap.docs[0]?.data();

    // 🔥 投稿が見つからない時
    if (!post) {
      return {
        title: "IZUscape",
        description:
          "偶然の出会いを楽しむ旅アプリ",
      };
    }

    return {
      title: `${post.title} | IZUscape`,
      description:
        post.description ||
        post.contents?.[0]?.slice(
          0,
          80
        ) ||
        "IZUscapeの体験投稿",
    };
  } catch (error) {
    console.error(error);

    return {
      title: "IZUscape",
      description:
        "偶然の出会いを楽しむ旅アプリ",
    };
  }
}

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}