"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function EditPage() {
  const params = useParams();
  const router = useRouter();

  const [post, setPost] = useState<any>(null);
  const [currentUser, setCurrentUser] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [area, setArea] =
    useState("shimoda");
  const [tags, setTags] = useState("");
  const [intro, setIntro] = useState("");
  const [spotNames, setSpotNames] =
    useState(["", "", ""]);
  const [contents, setContents] =
    useState(["", "", "", ""]);

  const [loading, setLoading] =
    useState(false);

  const areas = [
    { value: "shimoda", label: "下田市" },
    { value: "atami", label: "熱海市" },
    { value: "ito", label: "伊東市" },
    { value: "izu", label: "伊豆市" },
    {
      value: "izunokuni",
      label: "伊豆の国市",
    },
    {
      value: "higashiizu",
      label: "東伊豆町",
    },
    { value: "kawazu", label: "河津町" },
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
    { value: "kannami", label: "函南町" },
    { value: "mishima", label: "三島市" },
    { value: "numazu", label: "沼津市" },
  ];

  // ログイン状態取得
  useEffect(() => {
    const unsub =
      onAuthStateChanged(auth, (user) => {
        setCurrentUser(
          user?.uid || null
        );
      });

    return () => unsub();
  }, []);

  // 投稿取得
  useEffect(() => {
    const fetchPost = async () => {
      if (!params.id) return;

      try {
        const ref = doc(
          db,
          "posts",
          String(params.id)
        );

        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert(
            "投稿が見つかりません"
          );
          router.push("/");
          return;
        }

        const data: any = {
          id: snap.id,
          ...snap.data(),
        };

        setPost(data);

        setTitle(data.title || "");
        setArea(
          data.area || "shimoda"
        );
        setTags(
          (data.tags || []).join(", ")
        );
        setIntro(
          data.contents?.[0] || ""
        );

        setSpotNames([
          data.spotNames?.[0] || "",
          data.spotNames?.[1] || "",
          data.spotNames?.[2] || "",
        ]);

        setContents([
          data.contents?.[1] || "",
          data.contents?.[2] || "",
          data.contents?.[3] || "",
          "",
        ]);
      } catch (error) {
        console.error(error);
        alert(
          "投稿の取得に失敗しました"
        );
      }
    };

    fetchPost();
  }, [params.id, router]);

  // 権限チェック
  useEffect(() => {
    if (
      !post ||
      !currentUser
    )
      return;

    if (post.userId !== currentUser) {
      alert(
        "自分の投稿のみ編集できます"
      );
      router.push("/");
    }
  }, [post, currentUser, router]);

  // スポット名変更
  const handleSpotNameChange = (
    index: number,
    value: string
  ) => {
    const copy = [...spotNames];
    copy[index] = value;
    setSpotNames(copy);
  };

  // 内容変更
  const handleContentChange = (
    index: number,
    value: string
  ) => {
    const copy = [...contents];
    copy[index] = value;
    setContents(copy);
  };

  // 保存
  const handleUpdate =
    async () => {
      if (!post) return;

      if (!title.trim()) {
        alert(
          "タイトルを入力してください"
        );
        return;
      }

      setLoading(true);

      try {
        await updateDoc(
          doc(db, "posts", post.id),
          {
            title,
            area,
            tags: tags
              ? tags
                  .split(",")
                  .map((t) =>
                    t.trim()
                  )
                  .filter(Boolean)
              : ["体験"],

            contents: [
              intro,
              ...contents.filter(
                (c) => c.trim()
              ),
            ],

            spotNames:
              spotNames.filter((s) =>
                s.trim()
              ),
          }
        );

        alert(
          "投稿を更新しました🔥"
        );

        router.push(
          `/experience/${post.slug}`
        );
      } catch (error) {
        console.error(error);
        alert(
          "更新に失敗しました"
        );
      }

      setLoading(false);
    };

  if (!post) {
    return (
      <div style={container}>
        読み込み中...
      </div>
    );
  }

  return (
    <div style={container}>
      <h2 style={titleStyle}>
        投稿を編集する
      </h2>

      {/* エリア */}
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

      {/* タイトル */}
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

      {/* タグ */}
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

      {/* 導入 */}
      <textarea
        placeholder="導入文"
        value={intro}
        onChange={(e) =>
          setIntro(
            e.target.value
          )
        }
        style={textarea}
      />

      {/* スポット */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={spotBox}
        >
          <h3 style={sectionTitle}>
            スポット {i + 1}
          </h3>

          <input
            placeholder="スポット名"
            value={spotNames[i]}
            onChange={(e) =>
              handleSpotNameChange(
                i,
                e.target.value
              )
            }
            style={input}
          />

          <textarea
            placeholder="体験内容"
            value={contents[i]}
            onChange={(e) =>
              handleContentChange(
                i,
                e.target.value
              )
            }
            style={textarea}
          />
        </div>
      ))}

      <button
        onClick={handleUpdate}
        style={btnPrimary}
        disabled={loading}
      >
        {loading
          ? "保存中..."
          : "更新する"}
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