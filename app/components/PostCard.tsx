import Link from "next/link";

type Post = {
  id: string;
  title: string;
  imageUrl: string;
  slug: string;
};

export default function PostCard({
  post,
}: {
  post: Post;
}) {
  return (
    <Link
      href={`/experience/${post.slug}`}
      style={card}
    >
      {/* 画像エリア */}
      <div style={imageWrap}>
        <img
          src={post.imageUrl}
          alt={post.title}
          style={img}
        />

        {/* ❤️ 保存風アイコン（右上固定） */}
        <div style={heartButton}>
          ❤️
        </div>
      </div>

      {/* タイトル */}
      <div style={content}>
        <p style={title}>
          {post.title}
        </p>
      </div>
    </Link>
  );
}

////////////////////////////////////////////////

// 🎨 UI改善（機能そのまま）

const card = {
  minWidth: "200px",
  borderRadius: "18px",
  overflow: "hidden",
  background: "#fff",
  textDecoration: "none",
  boxShadow:
    "0 8px 24px rgba(0,0,0,0.06)",
  transition: "0.2s",
};

const imageWrap = {
  position: "relative" as const,
};

const img = {
  width: "100%",
  height: "150px",
  objectFit: "cover" as const,
};

const heartButton = {
  position: "absolute" as const,
  top: "12px",
  right: "12px",
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "rgba(255,255,255,0.92)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  boxShadow:
    "0 4px 14px rgba(0,0,0,0.08)",
  backdropFilter: "blur(6px)",
};

const content = {
  padding: "12px",
};

const title = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1F2D2A",
  lineHeight: "1.5",

  // 2行制限
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};