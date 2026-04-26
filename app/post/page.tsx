"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  addDoc,
} from "firebase/firestore";

import { slugify } from "@/lib/slugify";

export default function PostPage() {
  const router = useRouter();

  //////////////////////////////////////////////////
  // state

  const [title, setTitle] =
    useState("");

  const [area, setArea] =
    useState("shimoda");

  const [tags, setTags] =
    useState("");

  const [intro, setIntro] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showToast, setShowToast] =
    useState(false);

  const [images, setImages] =
    useState<File[]>([]);

  const [preview, setPreview] =
    useState<string[]>([]);

  const [contents, setContents] =
    useState(["", "", ""]);

  const [spots, setSpots] =
    useState([
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

  //////////////////////////////////////////////////
  // constants

  const CLOUD_NAME =
    "duoxbuhvf";

  const UPLOAD_PRESET =
    "unsigned_preset";

  const areas = [
    {
      value: "shimoda",
      label: "下田市",
    },
    {
      value: "atami",
      label: "熱海市",
    },
    {
      value: "ito",
      label: "伊東市",
    },
    {
      value: "izu",
      label: "伊豆市",
    },
    {
      value: "izunokuni",
      label: "伊豆の国市",
    },
    {
      value: "higashiizu",
      label: "東伊豆町",
    },
    {
      value: "kawazu",
      label: "河津町",
    },
    {
      value: "minamiizu",
      label: "南伊豆町",
    },
    {
      value: "matsuzaki",
      label: "松崎町",
    },
    {
      value: "nishiizu",
      label: "西伊豆町",
    },
    {
      value: "kannami",
      label: "函南町",
    },
    {
      value: "mishima",
      label: "三島市",
    },
    {
      value: "numazu",
      label: "沼津市",
    },
  ];

  const recommendedTags = [
    "カフェ",
    "絶景",
    "温泉",
    "海",
    "グルメ",
    "ドライブ",
    "デート",
    "穴場",
  ];

  //////////////////////////////////////////////////
  // おすすめタグ追加

  const addTag = (
    tag: string
  ) => {
    if (
      tags.includes(tag)
    )
      return;

    if (!tags) {
      setTags(tag);
      return;
    }

    setTags(
      `${tags}, ${tag}`
    );
  };

  //////////////////////////////////////////////////
  // メイン画像

  const handleImageChange = (
    e: any,
    index: number
  ) => {
    const file =
      e.target.files[0];

    if (!file) return;

    const newImages = [
      ...images,
    ];

    newImages[index] = file;
    setImages(newImages);

    const newPreview = [
      ...preview,
    ];

    newPreview[index] =
      URL.createObjectURL(
        file
      );

    setPreview(
      newPreview
    );
  };

  //////////////////////////////////////////////////
  // スポット変更

  const handleSpotChange = (
    index: number,
    key: string,
    value: any
  ) => {
    const copy = [
      ...spots,
    ];

    (copy[index] as any)[
      key
    ] = value;

    setSpots(copy);
  };

  //////////////////////////////////////////////////
  // Cloudinary upload

  const uploadToCloudinary =
    async (
      file: File
    ) => {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      formData.append(
        "upload_preset",
        UPLOAD_PRESET
      );

      const res =
        await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await res.json();

      return data.secure_url;
    };

  //////////////////////////////////////////////////
  // 投稿処理

  const handlePost = async () => {
    if (!auth.currentUser)
      return alert(
        "ログインしてください"
      );

    if (!title)
      return alert(
        "タイトルを入力してください"
      );

    if (
      images.length < 1 &&
      spots.every((s) => !s.file)
    ) {
      return alert(
        "画像を最低1枚入れてください"
      );
    }

    setLoading(true);

    try {
      const imageUrls: string[] =
        [];

      for (const file of images) {
        if (!file) continue;

        const url =
          await uploadToCloudinary(
            file
          );

        imageUrls.push(url);
      }
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
            .map((t) =>
              t.trim()
            )
        : ["体験"];

      let slug = slugify(
        title,
        area
      );

      slug = `${slug}-${Date.now()}`;

      await addDoc(
        collection(
          db,
          "posts"
        ),
        {
          title,
          area,
          slug,
          images: imageUrls,

          contents: [
            intro,
            ...contents,
            ...validSpots.map(
              (s) =>
                s.content
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

          createdAt:
            new Date(),
        }
      );

      setShowToast(true);

      setTimeout(() => {
        router.push("/");
      }, 1800);
    } catch (e) {
      console.error(e);
      alert(
        "投稿に失敗しました"
      );
    }

    setLoading(false);
  };

  //////////////////////////////////////////////////
  // return

  return (
    <main style={container}>
      <Link
        href="/"
        style={back}
      >
        ← ホームに戻る
      </Link>

      <div style={guideBox}>
        <p style={guideMini}>
          Good Post Tips
        </p>

        <h1 style={pageTitle}>
          旅の体験を投稿する
        </h1>

        <p style={guideText}>
          写真1枚目が
          表紙になります。
          <br />
          あとで編集もできるので
          気軽に投稿しよう。
        </p>
      </div>

      <div style={tagSection}>
        <p style={tagTitle}>
          おすすめタグ
        </p>

        <div style={tagWrap}>
          {recommendedTags.map(
            (tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  addTag(tag)
                }
                style={tagBtn}
              >
                #{tag}
              </button>
            )
          )}
        </div>
      </div>

      <select
        value={area}
        onChange={(e) =>
          setArea(
            e.target.value
          )
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

      <input
        placeholder="タイトル"
        value={title}
        onChange={(e) =>
          setTitle(
            e.target.value
          )
        }
        style={input}
      />

      <input
        placeholder="タグ（カンマ区切り）"
        value={tags}
        onChange={(e) =>
          setTags(
            e.target.value
          )
        }
        style={input}
      />

      <textarea
        placeholder="この旅の導入を書こう"
        value={intro}
        onChange={(e) =>
          setIntro(
            e.target.value
          )
        }
        style={textarea}
      />

      <button
        onClick={handlePost}
        disabled={loading}
        style={mainBtn}
      >
        {loading
          ? "投稿中..."
          : "旅を投稿する"}
      </button>

      {showToast && (
        <div style={toast}>
          投稿が完了しました！
        </div>
      )}
    </main>
  );
}

////////////////////////////////////////////////
// styles

const container = {
  maxWidth: "720px",
  margin: "0 auto",
  padding: "24px",
};

const back = {
  textDecoration: "none",
  color: "#666",
  fontSize: "14px",
};

const guideBox = {
  marginTop: "20px",
  marginBottom: "28px",
};

const guideMini = {
  fontSize: "13px",
  color: "#7A8782",
};

const pageTitle = {
  fontSize: "32px",
  fontWeight: "bold",
  color: "#1F3D2B",
  marginTop: "6px",
};

const guideText = {
  marginTop: "14px",
  lineHeight: 1.8,
  color: "#555",
};

const tagSection = {
  marginBottom: "20px",
};

const tagTitle = {
  fontWeight: "bold",
  marginBottom: "10px",
};

const tagWrap = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const tagBtn = {
  padding: "10px 16px",
  borderRadius: "999px",
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const input = {
  width: "100%",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  marginBottom: "14px",
};

const textarea = {
  width: "100%",
  minHeight: "140px",
  padding: "14px",
  borderRadius: "14px",
  border: "1px solid #ddd",
  resize: "none" as const,
  marginBottom: "20px",
};

const mainBtn = {
  width: "100%",
  padding: "16px",
  borderRadius: "999px",
  border: "none",
  background: "#1F3D2B",
  color: "#fff",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
};

const toast = {
  marginTop: "20px",
  padding: "14px",
  borderRadius: "14px",
  background: "#E8F5EC",
  color: "#1F3D2B",
  textAlign: "center" as const,
};