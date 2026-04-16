"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export default function PostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [contents, setContents] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);

  const CLOUD_NAME = "duoxbuhvf";
  const UPLOAD_PRESET = "unsigned_preset";

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

  const handlePost = async () => {
    if (!auth.currentUser) return alert("ログインして");
    if (!title) return alert("タイトルを入力して");
    if (images.length < 3) return alert("画像は3枚入れて");

    setLoading(true);

    try {
      const imageUrls: string[] = [];

      for (const file of images) {
        if (!file) continue;
        const url = await uploadToCloudinary(file);
        imageUrls.push(url);
      }

      await addDoc(collection(db, "posts"), {
        title,
        images: imageUrls,
        contents,
        tags: ["体験"],
        reactions: { scene: 0, same: 0, nice: 0 },

        // 🔥 ここ重要
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName,

        createdAt: new Date(),
      });

      alert("投稿完了🔥");
      router.push("/");
    } catch (e) {
      console.error(e);
      alert("投稿失敗");
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>投稿</h2>

      <input
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={input}
      />

      {[0, 1, 2].map((i) => (
        <div key={i} style={{ marginTop: "20px" }}>
          {preview[i] && <img src={preview[i]} style={img} />}

          <input type="file" onChange={(e) => handleImageChange(e, i)} />

          <textarea
            placeholder={`体験 ${i + 1}`}
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

      <button onClick={handlePost} style={btn}>
        {loading ? "投稿中..." : "投稿する"}
      </button>
    </div>
  );
}

const input = { width: "100%", padding: "10px", marginTop: "10px" };
const textarea = { width: "100%", height: "80px", marginTop: "10px" };
const img = { width: "100%", borderRadius: "10px", marginBottom: "10px" };
const btn = {
  marginTop: "20px",
  width: "100%",
  padding: "15px",
  background: "#333",
  color: "#fff",
};