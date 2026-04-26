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

  // 投稿完了UI
  const [showToast, setShowToast] = useState(false);

  // 旧投稿
  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [contents, setContents] = useState(["", "", ""]);

  // スポット投稿
  const [spots, setSpots] = useState([
    {
      name: "",
      content: "",
      file: null as File | null,
      preview: "",
    },
    {
      name: "",
      content: "",
      file: null as File | null,
      preview: "",
    },
    {
      name: "",
      content: "",
      file: null as File | null,
      preview: "",
    },
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
  const handleImageChange = (
    e: any,
    index: number
  ) => {
    const file = e.target.files[0];
    if (!file) return;

    const newImages = [...images];
    newImages[index] = file;
    setImages(newImages);

    const newPreview = [...preview];
    newPreview[index] =
      URL.createObjectURL(file);
    setPreview(newPreview);
  };

  // スポット変更
  const handleSpotChange = (
    index: number,
    key: string,
    value: any
  ) => {
    const copy = [...spots];
    (copy[index] as any)[key] = value;
    setSpots(copy);
  };

  // Cloudinary
  const uploadToCloudinary = async (
    file: File
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      UPLOAD_PRESET
    );

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
    if (!auth.currentUser)
      return alert("ログインして");

    if (!title)
      return alert(
        "タイトル入力して"
      );

    if (
      images.length < 1 &&
      spots.every((s) => !s.file)
    ) {
      return alert(
        "画像を最低1枚入れて"
      );
    }

    setLoading(true);

    try {
      const imageUrls: string[] = [];

      // 旧
      for (const file of images) {
        if (!file) continue;
        const url =
          await uploadToCloudinary(
            file
          );
        imageUrls.push(url);
      }

      // 新
      for (const s of spots) {
        if (s.file) {
          const url =
            await uploadToCloudinary(
              s.file
            );
          imageUrls.push(url);
        }
      }

      const validSpots =
        spots.filter(
          (s) =>
            s.name ||
            s.content ||
            s.file
        );

      const tagArray = tags
        ? tags
            .split(",")
            .map((t) => t.trim())
        : ["体験"];

      let slug = slugify(
        title,
        area
      );
      slug = `${slug}-${Date.now()}`;

      await addDoc(
        collection(db, "posts"),
        {
          title,
          area,
          slug,

          images: imageUrls,
          contents: [
            intro,
            ...contents,
            ...validSpots.map(
              (s) => s.content
            ),
          ],
          spotNames:
            validSpots.map(
              (s) => s.name
            ),

          tags: tagArray,
          reactions: {
            want: 0,
            same: 0,
            nice: 0,
          },

          userId:
            auth.currentUser.uid,
          userName:
            auth.currentUser
              .displayName ||
            "匿名",

          createdAt: new Date(),
        }
      );

      // 投稿完了表示
      setShowToast(true);
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
        <div style={toastOverlay}>
          <div style={toastCard}>
            <div style={toastIcon}>
              ✨
            </div>

            <h3 style={toastTitle}>
              投稿が公開されました！
            </h3>

            <p style={toastText}>
              あなたの旅の記録が
              誰かの偶然の出会いになるかも。
            </p>

            <div style={toastButtons}>
              <button
                style={
                  toastBtnSecondary
                }
                onClick={() =>
                  router.push("/")
                }
              >
                ホームへ戻る
              </button>

              <button
                style={
                  toastBtnPrimary
                }
                onClick={() =>
                  router.push("/")
                }
              >
                投稿を見る
              </button>
            </div>
          </div>
        </div>
      )}

      <h2 style={titleStyle}>
        投稿する
      </h2>

      {/* エリア */}
      <select
        value={area}
        onChange={(e) =>
          setArea(e.target.value)
        }
        style={input}
      >
        {areas.map((a) => (
          <option
            key={a.value}
            value={a.value}
          >
            {a.label}
          </option>
        ))}
      </select>

      {/* タイトル */}
      <input
        placeholder="タイトル"
        value={title}
        onChange={(e) =>
          setTitle(e.target.value)
        }
        style={input}
      />

      {/* タグ */}
      <input
        placeholder="タグ（カンマ区切り）"
        value={tags}
        onChange={(e) =>
          setTags(e.target.value)
        }
        style={input}
      />

      {/* 導入 */}
      <textarea
        placeholder="導入文"
        value={intro}
        onChange={(e) =>
          setIntro(e.target.value)
        }
        style={textarea}
      />

      {/* スポット */}
      {spots.map(
        (spot, index) => (
          <div
            key={index}
            style={spotBox}
          >
            <h3
              style={
                sectionTitle
              }
            >
              スポット{" "}
              {index + 1}
            </h3>

            <input
              placeholder="スポット名"
              value={spot.name}
              onChange={(e) =>
                handleSpotChange(
                  index,
                  "name",
                  e.target.value
                )
              }
              style={input}
            />

            <textarea
              placeholder="体験内容"
              value={
                spot.content
              }
              onChange={(e) =>
                handleSpotChange(
                  index,
                  "content",
                  e.target.value
                )
              }
              style={textarea}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleSpotChange(
                  index,
                  "file",
                  e.target.files?.[0] ||
                    null
                )
              }
              style={{
                marginTop:
                  "12px",
              }}
            />
          </div>
        )
      )}

      <button
        onClick={handlePost}
        style={btnPrimary}
        disabled={loading}
      >
        {loading
          ? "投稿中..."
          : "投稿する"}
      </button>
    </div>
  );
}

////////////////////////////////////////////////

const container = {
  maxWidth: "700px",
  margin: "0 auto",
  padding: "24px",
};

const titleStyle = {
  fontSize: "24px",
  fontWeight: "bold",
  marginBottom: "20px",
};

const sectionTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  marginBottom: "10px",
};

const input = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  marginTop: "12px",
  fontSize: "14px",
};

const textarea = {
  width: "100%",
  minHeight: "100px",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #ddd",
  marginTop: "12px",
  fontSize: "14px",
  resize: "vertical" as const,
};

const spotBox = {
  marginTop: "24px",
  padding: "18px",
  background: "#fff",
  borderRadius: "16px",
  boxShadow:
    "0 4px 14px rgba(0,0,0,0.05)",
};

const btnPrimary = {
  width: "100%",
  marginTop: "28px",
  padding: "16px",
  borderRadius: "999px",
  border: "none",
  background: "#1F3D2B",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "15px",
  cursor: "pointer",
};

const toastOverlay = {
  position: "fixed" as const,
  inset: 0,
  background:
    "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: "20px",
};

const toastCard = {
  width: "100%",
  maxWidth: "420px",
  background: "#fff",
  borderRadius: "24px",
  padding: "32px 24px",
  textAlign: "center" as const,
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.12)",
};

const toastIcon = {
  fontSize: "42px",
  marginBottom: "14px",
};

const toastTitle = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#1F3D2B",
  marginBottom: "10px",
};

const toastText = {
  fontSize: "14px",
  color: "#666",
  lineHeight: 1.8,
  marginBottom: "24px",
};

const toastButtons = {
  display: "flex",
  gap: "12px",
  justifyContent: "center",
};

const toastBtnPrimary = {
  flex: 1,
  border: "none",
  borderRadius: "999px",
  padding: "14px 18px",
  background: "#1F3D2B",
  color: "#fff",
  fontWeight: "bold",
  cursor: "pointer",
};

const toastBtnSecondary = {
  flex: 1,
  border: "1px solid #ddd",
  borderRadius: "999px",
  padding: "14px 18px",
  background: "#fff",
  color: "#333",
  fontWeight: "bold",
  cursor: "pointer",
};