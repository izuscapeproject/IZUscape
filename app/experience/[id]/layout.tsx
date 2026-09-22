import { Metadata } from "next";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

type ParamsType = {
  id: string;
};

const BASE_URL = "https://iz-uscape.vercel.app";

type PostData = {
  title?: string;
  description?: string;
  intro?: string;
  contents?: string[];
  images?: string[];
  tags?: string[];
  area?: string;
  slug?: string;
};

function getDescription(post: PostData) {
  const description =
    post.description ||
    post.intro ||
    post.contents?.find(
      (text) => typeof text === "string" && text.trim()
    ) ||
    "IZUscapeの体験投稿。実際に訪れた人の記録から、新しい旅や場所を見つけよう。";

  return description
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

async function getPost(
  postId: string
): Promise<{
  post: PostData | null;
  actualId: string | null;
}> {
  try {
    // ① まずFirestoreのドキュメントIDで検索
    const directDoc = await getDoc(
      doc(db, "posts", postId)
    );

    if (directDoc.exists()) {
      return {
        post: directDoc.data() as PostData,
        actualId: directDoc.id,
      };
    }

    // ② 見つからなければslugで検索
    const q = query(
      collection(db, "posts"),
      where("slug", "==", postId)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      const firstDoc = snap.docs[0];

      return {
        post: firstDoc.data() as PostData,
        actualId: firstDoc.id,
      };
    }

    return {
      post: null,
      actualId: null,
    };
  } catch (error) {
    console.error(
      "Failed to fetch post metadata:",
      error
    );

    return {
      post: null,
      actualId: null,
    };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ParamsType>;
}): Promise<Metadata> {
  // Next.js 16対応
  const resolvedParams = await params;

  const postId =
    typeof resolvedParams?.id === "string"
      ? resolvedParams.id
      : null;

  // IDがない場合
  if (!postId) {
    return {
      title:
        "IZUscape | 体験から、次の旅を見つける",

      description:
        "IZUscapeは、「やってみたいこと」や「過ごしたい時間」から旅や場所を見つける体験共有サービス。",

      robots: {
        index: true,
        follow: true,
      },
    };
  }

  const { post, actualId } =
    await getPost(postId);

  // 投稿が見つからない場合
  if (!post) {
    return {
      title:
        "IZUscape | 体験から、次の旅を見つける",

      description:
        "IZUscapeは、実際の体験から新しい旅や場所を見つけるサービスです。",

      robots: {
        index: true,
        follow: true,
      },
    };
  }

  const title =
    typeof post.title === "string" &&
    post.title.trim()
      ? post.title.trim()
      : "IZUscapeの体験投稿";

  const description =
    getDescription(post);

  // 投稿画像
  const image =
    Array.isArray(post.images) &&
    typeof post.images[0] === "string" &&
    post.images[0].trim()
      ? post.images[0]
      : `${BASE_URL}/ogp.png`;

  // キーワード
  const keywords = [
    "IZUscape",
    "体験",
    "旅",
    "旅行",
    "おでかけ",
    "観光",
    "体験共有",
    "旅行記",
    "旅の記録",
    "おすすめスポット",
    "場所探し",
    ...(typeof post.area === "string"
      ? [post.area]
      : []),
    ...(Array.isArray(post.tags)
      ? post.tags.filter(
          (tag): tag is string =>
            typeof tag === "string"
        )
      : []),
  ];

  const canonicalId =
    actualId || postId;

  const canonicalUrl =
    `${BASE_URL}/experience/${canonicalId}`;

  return {
    title: `${title} | IZUscape`,

    description,

    keywords,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      title: `${title} | IZUscape`,

      description,

      url: canonicalUrl,

      siteName: "IZUscape",

      locale: "ja_JP",

      type: "article",

      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",

      title: `${title} | IZUscape`,

      description,

      images: [image],
    },

    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default function ExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}