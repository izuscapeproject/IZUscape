// app/post/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { slugify } from "@/lib/slugify";

export default function PostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [area, setArea] = useState("shimoda");
  const [tags, setTags] = useState("");
  const [intro, setIntro] = useState("");

  // 投稿完了トースト
  const [showToast, setShowToast] = useState(false);

  // 旧投稿
  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [contents, setContents] = useState(["", "", ""]);

  // スポット投稿
  const [spots, setSpots] = useState([
    { name: "", content: "", file: null as File | null, preview: "" },
    { name: "", content: "", file: null as File | null, preview: "" },
    { name: "", content: "", file: null as File | null, preview: "" },
  ]);

  const [loading, setLoading] = useState(false);

  const CLOUD_NAME = "duoxbuhvf";
  const UPLOAD_PRESET = "unsigned_preset";

  const areas = [
    { value: "shimoda", label: "下田市" },
    { value: "atami", label: "熱海市" },
    { value: "ito", label: "伊東市" },
    { value: "izu", label: "伊豆市" },
    { value: "izunokuni", label: "伊豆の国市" },
    { value: "higashiizu", label: "東伊豆町" },
    { value: "kawazu", label: "河津町" },
    { value: "minamiizu", label: "南伊豆町" },
    { value: "matsuzaki", label: "松崎町" },
    { value: "nishiizu", label: "西伊豆町" },
    { value: "kannami", label: "函南町" },
    { value: "mishima", label: "三島市" },
    { value: "numazu", label: "沼津市" },
  ];

  // 旧画像
  const handleImageChange = (e: any, index: number) => {
    const file = e.target.files[0];
    if (!file) return;

    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);

    const newPreview = [...preview];
    newPreview[index] = URL.createObjectURL(file);
    setPreview(newPreview);
  };

  // スポット変更
  const handleSpotChange = (index: number, key: string, value: any) => {
    const copy = [...spots];
    (copy[index] as any)[key] = value;
    setSpots(copy);
  };

  // Cloudinary
  const uploadToCloudinary = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    return data.secure_url;
  };

  // 投稿
  const handlePost = async () => {
    if (!auth.currentUser) return alert("ログインして");
    if (!title) return alert("タイトル入力して");

    if (images.length < 1 && spots.every((s) => !s.file)) {
      return alert("画像を最低1枚入れて");
    }

    setLoading(true);

    try {
      const imageUrls: string[] = [];

      // 旧
      for (const file of images) {
        if (!file) continue;
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }

      // 新
      for (const s of spots) {
        if (s.file) {
          const url = await uploadToCloudinary(s.file);
          imageUrls.push(url);
        }
      }

      const validSpots = spots.filter(
        (s) => s.name || s.content || s.file
      );

      const tagArray = tags
        ? tags.split(",").map((t) => t.trim())
        : ["体験"];

      let slug = slugify(title, area);
      slug = `${slug}-${Date.now()}`;

      await addDoc(collection(db, "posts"), {
        title,
        area,
        slug,

        images: imageUrls,
        contents: [intro, ...contents, ...validSpots.map((s) => s.content)],
        spotNames: validSpots.map((s) => s.name),

        tags: tagArray,
        reactions: { want: 0, same: 0, nice: 0 },

        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || "匿名",

        createdAt: new Date(),
      });

      // 🔥 alert → トースト表示
      setShowToast(true);

      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (e) {
      console.error(e);
      alert("投稿失敗");
    }

    setLoading(false);
  };

  return (
    <div style={container}>
      {/* 投稿完了トースト */}
      {showToast && (
        <div style={toast}>
          ✨ 投稿が公開されました！
        </div>
      )}

      <h2 style={titleStyle}>投稿する</h2>

      {/* エリア */}
      <select
        value={area}
        onChange={(e) => setArea(e.target.value)}
        style={input}
      >
        {areas.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>

      {/* タイトル */}
      <input
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={input}
      />

      {/* タグ */}
      <input
        placeholder="タグ（例：温泉,カフェ）"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        style={input}
      />

      {/* 導入 */}
      <textarea
        placeholder="体験の概要"
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        style={textarea}
      />

      {/* シンプル投稿 */}
      <h3 style={sectionTitle}>シンプル投稿</h3>

      {[0, 1, 2].map((i) => (
        <div key={i}>
          {preview[i] && <img src={preview[i]} style={img} />}

          <input
            type="file"
            onChange={(e) => handleImageChange(e, i)}
          />

          <textarea
            value={contents[i]}
            onChange={(e) => {
              const copy = [...contents];
              copy[i] = e.target.value;
              setContents(copy);
            }}
            style={textarea}
          />
        </div>
      ))}

      {/* スポット投稿 */}
      <h3 style={sectionTitle}>スポット投稿</h3>

      {spots.map((spot, i) => (
        <div key={i} style={spotBox}>
          <input
            placeholder="スポット名"
            value={spot.name}
            onChange={(e) =>
              handleSpotChange(i, "name", e.target.value)
            }
            style={input}
          />

          {spot.preview && <img src={spot.preview} style={img} />}

          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              handleSpotChange(i, "file", file);
              handleSpotChange(
                i,
                "preview",
                URL.createObjectURL(file)
              );
            }}
          />

          <textarea
            placeholder="体験"
            value={spot.content}
            onChange={(e) =>
              handleSpotChange(i, "content", e.target.value)
            }
            style={textarea}
          />
        </div>
      ))}

      <button onClick={handlePost} style={btnPrimary}>
        {loading ? "投稿中..." : "投稿する"}
      </button>
    </div>
  );
}

////////////////////////////////////////////////

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  padding: "24px",
};

const titleStyle = {
  fontSize: "22px",
  fontWeight: "bold",
};

const sectionTitle = {
  marginTop: "20px",
  fontSize: "16px",
  fontWeight: "bold",
};

const input = {
  width: "100%",
  padding: "12px",
  marginTop: "10px",
  borderRadius: "10px",
  border: "1px solid #ddd",
};

const textarea = {
  width: "100%",
  height: "80px",
  marginTop: "10px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  padding: "10px",
};

const img = {
  width: "100%",
  borderRadius: "12px",
  marginTop: "10px",
};

const spotBox = {
  marginTop: "20px",
  padding: "12px",
  borderRadius: "12px",
  background: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
};

const btnPrimary = {
  marginTop: "24px",
  width: "100%",
  padding: "14px",
  background: "#2E7D5A",
  color: "#fff",
  border: "none",
  borderRadius: "999px",
  fontWeight: "bold",
};

const toast = {
  position: "fixed" as const,
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#2E7D5A",
  color: "#fff",
  padding: "14px 24px",
  borderRadius: "999px",
  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
  zIndex: 999,
  fontWeight: "bold",
};