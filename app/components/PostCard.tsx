import Link from "next/link";

type Post = {
  id: string;
  title: string;
  imageUrl: string;
  slug: string;
};

export default function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/experience/${post.slug}`}
      style={card}
    >
      <img
        src={post.imageUrl}
        alt={post.title}
        style={img}
      />

      <div style={content}>
        <p style={title}>
          {post.title}
        </p>
      </div>
    </Link>
  );
}

////////////////////////////////////////////////

// 🎨 UI改善（軽く・旅っぽく）

const card = {
  minWidth: "200px",
  borderRadius: "16px",
  overflow: "hidden",
  background: "#fff",
  textDecoration: "none",

  // 🔥 ここ重要（立体感）
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",

  transition: "0.2s",
};

const img = {
  width: "100%",
  height: "140px",
  objectFit: "cover" as const,
};

const content = {
  padding: "10px",
};

const title = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1F2D2A",

  // 🔥 2行制限
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
};