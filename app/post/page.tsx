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

type PostType = "trip" | "spot";

type Spot = {
  name: string;
  content: string;
  file: File | null;
  preview: string;
};

export default function PostPage() {
  const router = useRouter();

  //////////////////////////////////////////////////
  // 投稿タイプ
  //////////////////////////////////////////////////

  const [postType, setPostType] =
    useState<PostType>("trip");

  //////////////////////////////////////////////////
  // 基本情報
  //////////////////////////////////////////////////

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

  //////////////////////////////////////////////////
  // メイン写真
  //////////////////////////////////////////////////

  const [images, setImages] =
    useState<File[]>([]);

  const [preview, setPreview] =
    useState<string[]>([]);

  const MAX_IMAGES = 10;

  //////////////////////////////////////////////////
  // 旅の内容
  //////////////////////////////////////////////////

  const [contents, setContents] =
    useState<string[]>([
      "",
      "",
      "",
    ]);

  //////////////////////////////////////////////////
  // 訪れた場所
  //
  // 最初は1個だけ
  //////////////////////////////////////////////////

  const [spots, setSpots] =
    useState<Spot[]>([
      {
        name: "",
        content: "",
        file: null,
        preview: "",
      },
    ]);

  const MAX_SPOTS = 10;

  //////////////////////////////////////////////////
  // 条件
  //////////////////////////////////////////////////

  const [conditions, setConditions] =
    useState<string[]>([]);

  //////////////////////////////////////////////////
  // Cloudinary
  //////////////////////////////////////////////////

  const CLOUD_NAME =
    "duoxbuhvf";

  const UPLOAD_PRESET =
    "unsigned_preset";

  //////////////////////////////////////////////////
  // エリア
  //////////////////////////////////////////////////

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

  //////////////////////////////////////////////////
  // タグ
  //////////////////////////////////////////////////

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
  // 条件
  //////////////////////////////////////////////////

  const conditionOptions = [
    "無料",
    "Wi-Fiあり",
    "電源あり",
    "駐車場あり",
    "雨でもOK",
    "駅から行きやすい",
    "一人でも行きやすい",
    "静か",
    "写真を撮りやすい",
    "長時間過ごせる",
  ];

  //////////////////////////////////////////////////
  // タグ追加
  //////////////////////////////////////////////////

  const addTag = (tag: string) => {
    const currentTags = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (currentTags.includes(tag)) {
      return;
    }

    if (currentTags.length === 0) {
      setTags(tag);
      return;
    }

    setTags(
      `${tags}, ${tag}`
    );
  };

  //////////////////////////////////////////////////
  // 条件切り替え
  //////////////////////////////////////////////////

  const toggleCondition = (
    condition: string
  ) => {
    setConditions((current) => {
      if (
        current.includes(condition)
      ) {
        return current.filter(
          (item) =>
            item !== condition
        );
      }

      return [
        ...current,
        condition,
      ];
    });
  };

  //////////////////////////////////////////////////
  // 投稿タイプ変更
  //////////////////////////////////////////////////

  const changePostType = (
    type: PostType
  ) => {
    setPostType(type);
  };

  //////////////////////////////////////////////////
  // メイン写真追加
  //////////////////////////////////////////////////

  const addImages = (
    files: File[]
  ) => {
    const imageFiles =
      files.filter((file) =>
        file.type.startsWith(
          "image/"
        )
      );

    if (
      imageFiles.length === 0
    ) {
      return;
    }

    const remaining =
      MAX_IMAGES - images.length;

    if (remaining <= 0) {
      alert(
        `写真は最大${MAX_IMAGES}枚までです`
      );
      return;
    }

    const selected =
      imageFiles.slice(
        0,
        remaining
      );

    const newPreviews =
      selected.map((file) =>
        URL.createObjectURL(
          file
        )
      );

    setImages((current) => [
      ...current,
      ...selected,
    ]);

    setPreview((current) => [
      ...current,
      ...newPreviews,
    ]);
  };

  //////////////////////////////////////////////////
  // メイン写真削除
  //////////////////////////////////////////////////

  const removeImage = (
    index: number
  ) => {
    setImages((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );

    setPreview((current) => {
      const target =
        current[index];

      if (target) {
        URL.revokeObjectURL(
          target
        );
      }

      return current.filter(
        (_, i) => i !== index
      );
    });
  };

  //////////////////////////////////////////////////
  // メイン写真選択
  //////////////////////////////////////////////////

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      e.target.files || []
    );

    addImages(files);

    e.target.value = "";
  };

  //////////////////////////////////////////////////
  // 旅の内容変更
  //////////////////////////////////////////////////

  const handleContentChange = (
    index: number,
    value: string
  ) => {
    setContents((current) => {
      const copy = [...current];

      copy[index] = value;

      return copy;
    });
  };

  //////////////////////////////////////////////////
  // スポット変更
  //////////////////////////////////////////////////

  const handleSpotChange = (
    index: number,
    key: "name" | "content",
    value: string
  ) => {
    setSpots((current) => {
      const copy = [...current];

      copy[index] = {
        ...copy[index],
        [key]: value,
      };

      return copy;
    });
  };

  //////////////////////////////////////////////////
  // スポット追加
  //////////////////////////////////////////////////

  const addSpot = () => {
    if (
      spots.length >= MAX_SPOTS
    ) {
      alert(
        `スポットは最大${MAX_SPOTS}か所まで追加できます`
      );
      return;
    }

    setSpots((current) => [
      ...current,
      {
        name: "",
        content: "",
        file: null,
        preview: "",
      },
    ]);
  };

  //////////////////////////////////////////////////
  // スポット削除
  //////////////////////////////////////////////////

  const removeSpot = (
    index: number
  ) => {
    // 最後の1個は残す
    if (spots.length === 1) {
      setSpots([
        {
          name: "",
          content: "",
          file: null,
          preview: "",
        },
      ]);

      return;
    }

    const target =
      spots[index];

    if (target.preview) {
      URL.revokeObjectURL(
        target.preview
      );
    }

    setSpots((current) =>
      current.filter(
        (_, i) => i !== index
      )
    );
  };

  //////////////////////////////////////////////////
  // スポット画像
  //////////////////////////////////////////////////

  const handleSpotImageChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      alert(
        "画像ファイルを選択してください"
      );
      return;
    }

    setSpots((current) => {
      const copy = [...current];

      if (
        copy[index].preview
      ) {
        URL.revokeObjectURL(
          copy[index].preview
        );
      }

      copy[index] = {
        ...copy[index],
        file,
        preview:
          URL.createObjectURL(
            file
          ),
      };

      return copy;
    });

    e.target.value = "";
  };

  //////////////////////////////////////////////////
  // スポット画像削除
  //////////////////////////////////////////////////

  const removeSpotImage = (
    index: number
  ) => {
    setSpots((current) => {
      const copy = [...current];

      if (
        copy[index].preview
      ) {
        URL.revokeObjectURL(
          copy[index].preview
        );
      }

      copy[index] = {
        ...copy[index],
        file: null,
        preview: "",
      };

      return copy;
    });
  };

  //////////////////////////////////////////////////
  // Cloudinary
  //////////////////////////////////////////////////

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

      if (!res.ok) {
        throw new Error(
          "画像アップロードに失敗しました"
        );
      }

      const data =
        await res.json();

      return data.secure_url;
    };

  //////////////////////////////////////////////////
  // 投稿
  //////////////////////////////////////////////////

  const handlePost =
    async () => {
      if (!auth.currentUser) {
        alert(
          "ログインしてください"
        );
        return;
      }

      if (!title.trim()) {
        alert(
          postType === "trip"
            ? "旅のタイトルを入力してください"
            : "場所の名前を入力してください"
        );
        return;
      }

      if (
        images.length === 0
      ) {
        alert(
          "写真を最低1枚追加してください"
        );
        return;
      }

      setLoading(true);

      try {
        //////////////////////////////////////////////////
        // メイン写真アップロード
        //////////////////////////////////////////////////

        const imageUrls: string[] =
          [];

        for (
          const file of images
        ) {
          const url =
            await uploadToCloudinary(
              file
            );

          imageUrls.push(url);
        }

        //////////////////////////////////////////////////
        // スポット
        //////////////////////////////////////////////////

        const uploadedSpots: {
          name: string;
          content: string;
          imageUrl: string;
        }[] = [];

        if (
          postType === "trip"
        ) {
          for (
            const spot of spots
          ) {
            const hasContent =
              spot.name.trim() ||
              spot.content.trim() ||
              spot.file;

            if (!hasContent) {
              continue;
            }

            let imageUrl = "";

            if (spot.file) {
              imageUrl =
                await uploadToCloudinary(
                  spot.file
                );
            }

            uploadedSpots.push({
              name:
                spot.name.trim(),
              content:
                spot.content.trim(),
              imageUrl,
            });
          }
        }

        //////////////////////////////////////////////////
        // タグ
        //////////////////////////////////////////////////

        const tagArray =
          tags.trim()
            ? tags
                .split(",")
                .map((tag) =>
                  tag.trim()
                )
                .filter(Boolean)
            : ["体験"];

        //////////////////////////////////////////////////
        // slug
        //////////////////////////////////////////////////

        let slug =
          slugify(
            title,
            area
          );

        slug =
          `${slug}-${Date.now()}`;

        //////////////////////////////////////////////////
        // Firestore
        //////////////////////////////////////////////////

        await addDoc(
          collection(
            db,
            "posts"
          ),
          {
            // 投稿タイプ
            postType,

            // 基本情報
            title:
              title.trim(),

            area,

            slug,

            // メイン写真
            images:
              imageUrls,

            // 説明
            intro:
              intro.trim(),

            // 旅の内容
            contents:
              postType === "trip"
                ? contents.filter(
                    (content) =>
                      content.trim()
                  )
                : [],

            // 訪れた場所
            spots:
              uploadedSpots,

            // 旧データとの互換用
            spotNames:
              uploadedSpots.map(
                (spot) =>
                  spot.name
              ),

            spotImages:
              uploadedSpots
                .map(
                  (spot) =>
                    spot.imageUrl
                )
                .filter(Boolean),

            // タグ
            tags:
              tagArray,

            // 条件
            conditions,

            // リアクション
            reactions: {
              want: 0,
              same: 0,
              nice: 0,
            },

            // ユーザー
            userId:
              auth.currentUser
                .uid,

            userName:
              auth.currentUser
                .displayName ||
              "匿名",

            createdAt:
              new Date(),
          }
        );

        //////////////////////////////////////////////////
        // 完了
        //////////////////////////////////////////////////

        setShowToast(true);

        setTimeout(() => {
          router.push("/");
        }, 1800);
      } catch (error) {
        console.error(
          "投稿エラー:",
          error
        );

        alert(
          "投稿に失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

  //////////////////////////////////////////////////
  // 表示
  //////////////////////////////////////////////////

  return (
    <main style={container}>

      {/* 戻る */}
      <Link
        href="/"
        style={back}
      >
        ← ホームに戻る
      </Link>

      {/* ========================================
          HEADER
      ======================================== */}

      <div style={guideBox}>

        <p style={guideMini}>
          CREATE
        </p>

        <h1 style={pageTitle}>
          {postType === "trip"
            ? "旅を記録する"
            : "場所を紹介する"}
        </h1>

        <p style={guideText}>
          {postType === "trip"
            ? "あなたの旅の思い出を、次の誰かの旅につなげよう。"
            : "あなたが見つけたおすすめの場所を、次の誰かの旅につなげよう。"}
        </p>

      </div>

      {/* ========================================
          投稿タイプ
      ======================================== */}

      <section
        style={typeSection}
      >

        <p style={sectionMini}>
          POST TYPE
        </p>

        <h2 style={sectionTitle}>
          何を投稿する？
        </h2>

        <div
          style={typeGrid}
        >

          <button
            type="button"
            onClick={() =>
              changePostType(
                "trip"
              )
            }
            style={{
              ...typeCard,
              ...(postType ===
              "trip"
                ? typeCardSelected
                : {}),
            }}
          >

            <span
              style={typeIcon}
            >
              🗺️
            </span>

            <span
              style={typeName}
            >
              旅
            </span>

            <span
              style={typeDescription}
            >
              複数の場所を巡った
              <br />
              旅の記録
            </span>

            {postType ===
              "trip" && (
              <span
                style={typeSelectedMark}
              >
                ✓ 選択中
              </span>
            )}

          </button>

          <button
            type="button"
            onClick={() =>
              changePostType(
                "spot"
              )
            }
            style={{
              ...typeCard,
              ...(postType ===
              "spot"
                ? typeCardSelected
                : {}),
            }}
          >

            <span
              style={typeIcon}
            >
              📍
            </span>

            <span
              style={typeName}
            >
              場所
            </span>

            <span
              style={typeDescription}
            >
              おすすめしたい
              <br />
              ひとつの場所
            </span>

            {postType ===
              "spot" && (
              <span
                style={typeSelectedMark}
              >
                ✓ 選択中
              </span>
            )}

          </button>

        </div>

      </section>

      {/* ========================================
          写真
      ======================================== */}

      <section
        style={photoSection}
      >

        <div
          style={photoHeader}
        >

          <p style={photoMini}>
            {postType === "trip"
              ? "TRAVEL PHOTOS"
              : "PLACE PHOTOS"}
          </p>

          <h2
            style={photoTitle}
          >
            {postType === "trip"
              ? "旅の写真"
              : "場所の写真"}
          </h2>

          <p
            style={photoText}
          >
            {postType === "trip"
              ? "この旅で撮った写真を追加してください。"
              : "この場所の雰囲気が伝わる写真を追加してください。"}
            <br />
            1枚目の写真が表紙になります。
          </p>

        </div>

        <div
          style={photoGrid}
        >

          {preview.map(
            (src, index) => (
              <div
                key={`${src}-${index}`}
                style={photoItem}
              >

                <img
                  src={src}
                  alt={`写真 ${
                    index + 1
                  }`}
                  style={photoImage}
                />

                {index === 0 && (
                  <span
                    style={coverLabel}
                  >
                    表紙
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    removeImage(
                      index
                    )
                  }
                  style={photoDelete}
                  aria-label="写真を削除"
                >
                  ×
                </button>

              </div>
            )
          )}

          {images.length <
            MAX_IMAGES && (
            <label
              style={photoAdd}
            >

              <span
                style={
                  photoAddIcon
                }
              >
                ＋
              </span>

              <span>
                写真を追加
              </span>

              <span
                style={
                  photoAddSmall
                }
              >
                複数枚選択できます
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={
                  handleImageChange
                }
              />

            </label>
          )}

        </div>

        <div
          style={photoFooter}
        >

          <span>
            {images.length} /{" "}
            {MAX_IMAGES} 枚
          </span>

          {images.length ===
            0 && (
            <span>
              写真を1枚以上追加してください
            </span>
          )}

        </div>

      </section>

      {/* ========================================
          エリア
      ======================================== */}

      <section
        style={formSection}
      >

        <p style={sectionMini}>
          AREA
        </p>

        <h2 style={sectionTitle}>
          {postType === "trip"
            ? "どこを旅した？"
            : "どこの場所？"}
        </h2>

        <select
          value={area}
          onChange={(e) =>
            setArea(
              e.target.value
            )
          }
          style={input}
        >

          {areas.map(
            (item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            )
          )}

        </select>

      </section>

      {/* ========================================
          タイトル
      ======================================== */}

      <section
        style={formSection}
      >

        <p style={sectionMini}>
          {postType === "trip"
            ? "TITLE"
            : "PLACE NAME"}
        </p>

        <h2 style={sectionTitle}>
          {postType === "trip"
            ? "旅にタイトルをつけよう"
            : "場所の名前"}
        </h2>

        <input
          placeholder={
            postType === "trip"
              ? "例：下田で見つけた静かな海辺"
              : "例：○○カフェ"
          }
          value={title}
          onChange={(e) =>
            setTitle(
              e.target.value
            )
          }
          style={input}
        />

      </section>

      {/* ========================================
          説明
      ======================================== */}

      <section
        style={formSection}
      >

        <p style={sectionMini}>
          {postType === "trip"
            ? "STORY"
            : "ABOUT"}
        </p>

        <h2 style={sectionTitle}>
          {postType === "trip"
            ? "どんな旅だった？"
            : "どんな場所？"}
        </h2>

        <textarea
          placeholder={
            postType === "trip"
              ? "旅のきっかけや、そのときの気持ちを書いてみよう。"
              : "この場所の雰囲気や、どんな人におすすめかを書いてみよう。"
          }
          value={intro}
          onChange={(e) =>
            setIntro(
              e.target.value
            )
          }
          style={textarea}
        />

      </section>

      {/* ========================================
          旅の内容
      ======================================== */}

      {postType ===
        "trip" && (
        <section
          style={formSection}
        >

          <p style={sectionMini}>
            MEMORIES
          </p>

          <h2
            style={sectionTitle}
          >
            旅の記録
          </h2>

          <p
            style={
              sectionDescription
            }
          >
            印象に残ったことや、
            その場所で感じたことを書いてみよう。
          </p>

          {contents.map(
            (content, index) => (
              <textarea
                key={index}
                placeholder={
                  index === 0
                    ? "印象に残ったこと"
                    : index === 1
                    ? "旅の中で何をした？"
                    : "誰かに伝えたいこと"
                }
                value={content}
                onChange={(e) =>
                  handleContentChange(
                    index,
                    e.target.value
                  )
                }
                style={
                  smallTextarea
                }
              />
            )
          )}

        </section>
      )}

      {/* ========================================
          訪れた場所
      ======================================== */}

      {postType ===
        "trip" && (
        <section
          style={spotsSection}
        >

          <div
            style={
              spotsHeader
            }
          >

            <div>
              <p
                style={
                  sectionMini
                }
              >
                PLACES
              </p>

              <h2
                style={
                  sectionTitleNoMargin
                }
              >
                訪れた場所
              </h2>

              <p
                style={
                  sectionDescription
                }
              >
                この旅で立ち寄った場所を追加できます。
              </p>
            </div>

            <div
              style={
                spotCount
              }
            >
              {spots.length} /{" "}
              {MAX_SPOTS}
            </div>

          </div>

          {/* スポット一覧 */}

          <div
            style={
              spotsList
            }
          >

            {spots.map(
              (spot, index) => (
                <div
                  key={index}
                  style={spotCard}
                >

                  {/* スポットヘッダー */}

                  <div
                    style={
                      spotCardHeader
                    }
                  >

                    <div
                      style={
                        spotNumberCircle
                      }
                    >
                      {index + 1}
                    </div>

                    <div
                      style={
                        spotCardTitleArea
                      }
                    >
                      <span
                        style={
                          spotCardMini
                        }
                      >
                        SPOT
                      </span>

                      <strong
                        style={
                          spotCardTitle
                        }
                      >
                        {spot.name.trim()
                          ? spot.name
                          : `訪れた場所 ${
                              index + 1
                            }`}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeSpot(
                          index
                        )
                      }
                      style={
                        spotDeleteButton
                      }
                    >
                      削除
                    </button>

                  </div>

                  {/* 場所名 */}

                  <input
                    placeholder="場所の名前"
                    value={
                      spot.name
                    }
                    onChange={(e) =>
                      handleSpotChange(
                        index,
                        "name",
                        e.target.value
                      )
                    }
                    style={input}
                  />

                  {/* 内容 */}

                  <textarea
                    placeholder="ここで何をした？どんな場所だった？"
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
                    style={
                      smallTextarea
                    }
                  />

                  {/* スポット写真 */}

                  {spot.preview ? (
                    <div
                      style={
                        spotPhotoPreviewWrap
                      }
                    >

                      <img
                        src={
                          spot.preview
                        }
                        alt=""
                        style={
                          spotPhotoPreview
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeSpotImage(
                            index
                          )
                        }
                        style={
                          spotPhotoRemove
                        }
                      >
                        写真を削除
                      </button>

                    </div>
                  ) : (
                    <label
                      style={
                        spotPhotoButton
                      }
                    >
                      <span
                        style={
                          spotPhotoIcon
                        }
                      >
                        📷
                      </span>

                      <span>
                        この場所の写真を追加
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) =>
                          handleSpotImageChange(
                            index,
                            e
                          )
                        }
                      />
                    </label>
                  )}

                </div>
              )
            )}

          </div>

          {/* 場所追加 */}

          {spots.length <
            MAX_SPOTS && (
            <button
              type="button"
              onClick={addSpot}
              style={
                addSpotButton
              }
            >

              <span
                style={
                  addSpotIcon
                }
              >
                ＋
              </span>

              <span>
                訪れた場所を追加
              </span>

            </button>
          )}

          <p
            style={
              spotHelpText
            }
          >
            必要な数だけ追加できます。使わない項目は削除できます。
          </p>

        </section>
      )}

      {/* ========================================
          条件
      ======================================== */}

      <section
        style={
          conditionSection
        }
      >

        <div
          style={
            conditionHeader
          }
        >

          <p
            style={
              conditionMini
            }
          >
            CONDITIONS
          </p>

          <h2
            style={
              conditionTitle
            }
          >
            {postType === "trip"
              ? "この旅の条件"
              : "この場所の条件"}
          </h2>

          <p
            style={
              conditionText
            }
          >
            {postType === "trip"
              ? "この旅に当てはまるものを選んでください。"
              : "この場所に当てはまるものを選んでください。"}
          </p>

        </div>

        <div
          style={
            conditionWrap
          }
        >

          {conditionOptions.map(
            (condition) => {
              const selected =
                conditions.includes(
                  condition
                );

              return (
                <button
                  key={condition}
                  type="button"
                  onClick={() =>
                    toggleCondition(
                      condition
                    )
                  }
                  style={{
                    ...conditionBtn,
                    ...(selected
                      ? conditionBtnSelected
                      : {}),
                  }}
                >

                  <span
                    style={{
                      ...conditionCheck,
                      ...(selected
                        ? conditionCheckSelected
                        : {}),
                    }}
                  >
                    {selected
                      ? "✓"
                      : ""}
                  </span>

                  {condition}

                </button>
              );
            }
          )}

        </div>

        {conditions.length >
          0 && (
          <p
            style={
              selectedText
            }
          >
            {conditions.length}
            個の条件を選択中
          </p>
        )}

      </section>

      {/* ========================================
          タグ
      ======================================== */}

      <section
        style={formSection}
      >

        <p style={sectionMini}>
          TAGS
        </p>

        <h2 style={sectionTitle}>
          {postType === "trip"
            ? "この旅を表すタグ"
            : "この場所を表すタグ"}
        </h2>

        <div
          style={
            tagWrap
          }
        >

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

        <input
          placeholder="タグ（カンマ区切り）"
          value={tags}
          onChange={(e) =>
            setTags(
              e.target.value
            )
          }
          style={{
            ...input,
            marginTop:
              "12px",
          }}
        />

      </section>

      {/* ========================================
          投稿ボタン
      ======================================== */}

      <button
        type="button"
        onClick={handlePost}
        disabled={loading}
        style={{
          ...mainBtn,
          opacity:
            loading ? 0.6 : 1,
        }}
      >
        {loading
          ? "投稿中..."
          : postType === "trip"
          ? "旅を投稿する"
          : "場所を投稿する"}
      </button>

      {/* 完了 */}

      {showToast && (
        <div
          style={toast}
        >
          {postType === "trip"
            ? "旅を投稿しました！"
            : "場所を投稿しました！"}
        </div>
      )}

    </main>
  );
}

////////////////////////////////////////////////
// styles
////////////////////////////////////////////////

const container = {
  maxWidth: "760px",
  margin: "0 auto",
  padding:
    "32px 24px 80px",
};

const back = {
  textDecoration: "none",
  color: "#66736D",
  fontSize: "14px",
};

const guideBox = {
  marginTop: "24px",
  marginBottom: "30px",
};

const guideMini = {
  margin: "0 0 6px",
  fontSize: "11px",
  letterSpacing: "0.12em",
  color: "#829189",
};

const pageTitle = {
  margin: "0",
  fontSize: "32px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const guideText = {
  marginTop: "12px",
  lineHeight: 1.8,
  color: "#65716B",
};

////////////////////////////////////////////////
// 投稿タイプ
////////////////////////////////////////////////

const typeSection = {
  marginBottom: "34px",
};

const typeGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, 1fr)",
  gap: "12px",
};

const typeCard = {
  position: "relative" as const,
  padding: "22px 18px",
  borderRadius: "18px",
  border:
    "1px solid #DDE5DF",
  background: "#fff",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems:
    "flex-start" as const,
  textAlign:
    "left" as const,
  cursor: "pointer",
  fontFamily: "inherit",
};

const typeCardSelected = {
  border:
    "2px solid #1F3D2B",
  background:
    "#F2F7F3",
};

const typeIcon = {
  fontSize: "28px",
  marginBottom: "10px",
};

const typeName = {
  fontSize: "19px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

const typeDescription = {
  marginTop: "7px",
  fontSize: "12px",
  lineHeight: 1.7,
  color: "#6B7770",
};

const typeSelectedMark = {
  marginTop: "13px",
  fontSize: "11px",
  fontWeight: "bold",
  color: "#1F3D2B",
};

////////////////////////////////////////////////
// 共通フォーム
////////////////////////////////////////////////

const formSection = {
  marginBottom: "30px",
};

const sectionMini = {
  margin: "0 0 6px",
  fontSize: "11px",
  letterSpacing: "0.12em",
  color: "#829189",
};

const sectionTitle = {
  margin:
    "0 0 14px",
  fontSize: "20px",
  color: "#1F3D2B",
};

const sectionTitleNoMargin = {
  margin: "0",
  fontSize: "20px",
  color: "#1F3D2B",
};

const sectionDescription = {
  margin:
    "8px 0 14px",
  fontSize: "13px",
  lineHeight: 1.7,
  color: "#69766F",
};

const input = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  padding: "14px 15px",
  borderRadius:
    "13px",
  border:
    "1px solid #DDE4DF",
  background: "#fff",
  fontSize: "14px",
  fontFamily:
    "inherit",
  outline: "none",
};

const textarea = {
  width: "100%",
  boxSizing:
    "border-box" as const,
  minHeight: "150px",
  padding: "14px 15px",
  borderRadius:
    "13px",
  border:
    "1px solid #DDE4DF",
  background: "#fff",
  fontSize: "14px",
  lineHeight: 1.7,
  fontFamily:
    "inherit",
  resize:
    "vertical" as const,
};

const smallTextarea = {
  ...textarea,
  minHeight: "100px",
  marginBottom: "12px",
};

////////////////////////////////////////////////
// 写真
////////////////////////////////////////////////

const photoSection = {
  marginBottom: "36px",
};

const photoHeader = {
  marginBottom: "16px",
};

const photoMini = {
  margin: "0 0 6px",
  fontSize: "11px",
  letterSpacing: "0.12em",
  color: "#829189",
};

const photoTitle = {
  margin: "0",
  color: "#1F3D2B",
  fontSize: "21px",
};

const photoText = {
  margin: "8px 0 0",
  color: "#69766F",
  fontSize: "13px",
  lineHeight: 1.7,
};

const photoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, 1fr)",
  gap: "10px",
};

const photoItem = {
  position: "relative" as const,
  aspectRatio: "1 / 1",
  overflow: "hidden",
  borderRadius: "15px",
  background:
    "#EEF2EF",
};

const photoImage = {
  width: "100%",
  height: "100%",
  objectFit:
    "cover" as const,
  display: "block",
};

const coverLabel = {
  position:
    "absolute" as const,
  top: "9px",
  left: "9px",
  padding:
    "5px 10px",
  borderRadius:
    "999px",
  background:
    "#1F3D2B",
  color: "#fff",
  fontSize: "11px",
  fontWeight: "bold",
};

const photoDelete = {
  position:
    "absolute" as const,
  top: "8px",
  right: "8px",
  width: "30px",
  height: "30px",
  border: "none",
  borderRadius:
    "50%",
  background:
    "rgba(0,0,0,0.62)",
  color: "#fff",
  fontSize: "20px",
  lineHeight: 1,
  cursor: "pointer",
};

const photoAdd = {
  aspectRatio: "1 / 1",
  borderRadius:
    "15px",
  border:
    "1px dashed #B9C5BE",
  background:
    "#F7F9F7",
  display: "flex",
  flexDirection:
    "column" as const,
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: "7px",
  color:
    "#60796C",
  fontSize: "13px",
  cursor:
    "pointer",
  textAlign:
    "center" as const,
};

const photoAddIcon = {
  fontSize: "28px",
  lineHeight: 1,
};

const photoAddSmall = {
  fontSize: "10px",
  color: "#8A9690",
};

const photoFooter = {
  display: "flex",
  justifyContent:
    "space-between",
  marginTop: "10px",
  color: "#829189",
  fontSize: "12px",
};

////////////////////////////////////////////////
// スポット
////////////////////////////////////////////////

const spotsSection = {
  marginBottom: "34px",
};

const spotsHeader = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "20px",
  marginBottom: "18px",
};

const spotCount = {
  flexShrink: 0,
  padding:
    "7px 12px",
  borderRadius:
    "999px",
  background:
    "#EEF3EF",
  color:
    "#61736A",
  fontSize: "12px",
  fontWeight: "bold",
};

const spotsList = {
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "14px",
};

const spotCard = {
  padding: "18px",
  borderRadius: "18px",
  border:
    "1px solid #E0E7E2",
  background:
    "#F8FAF8",
};

const spotCardHeader = {
  display: "flex",
  alignItems:
    "center",
  gap: "11px",
  marginBottom: "15px",
};

const spotNumberCircle = {
  width: "34px",
  height: "34px",
  flexShrink: 0,
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  borderRadius:
    "50%",
  background:
    "#1F3D2B",
  color: "#fff",
  fontSize: "13px",
  fontWeight: "bold",
};

const spotCardTitleArea = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection:
    "column" as const,
  gap: "2px",
};

const spotCardMini = {
  fontSize: "9px",
  letterSpacing:
    "0.12em",
  color: "#8A9790",
};

const spotCardTitle = {
  fontSize: "14px",
  color: "#30483C",
  overflow: "hidden",
  textOverflow:
    "ellipsis",
  whiteSpace:
    "nowrap" as const,
};

const spotDeleteButton = {
  border: "none",
  background:
    "transparent",
  color: "#9A7777",
  fontSize: "12px",
  cursor:
    "pointer",
  padding:
    "6px 4px",
};

const spotPhotoButton = {
  minHeight: "64px",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: "8px",
  border:
    "1px dashed #B9C5BE",
  borderRadius:
    "13px",
  background:
    "#fff",
  color:
    "#60796C",
  fontSize: "13px",
  cursor:
    "pointer",
};

const spotPhotoIcon = {
  fontSize: "18px",
};

const spotPhotoPreviewWrap = {
  position:
    "relative" as const,
  marginTop: "2px",
};

const spotPhotoPreview = {
  width: "100%",
  maxHeight: "240px",
  objectFit:
    "cover" as const,
  display: "block",
  borderRadius:
    "13px",
};

const spotPhotoRemove = {
  position:
    "absolute" as const,
  right: "9px",
  bottom: "9px",
  padding:
    "7px 11px",
  border: "none",
  borderRadius:
    "999px",
  background:
    "rgba(0,0,0,0.62)",
  color: "#fff",
  fontSize: "11px",
  cursor:
    "pointer",
};

const addSpotButton = {
  width: "100%",
  marginTop: "14px",
  padding: "15px",
  display: "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  gap: "8px",
  border:
    "1px dashed #AABBB0",
  borderRadius:
    "14px",
  background:
    "#fff",
  color:
    "#486256",
  fontSize: "14px",
  fontWeight:
    "bold",
  cursor:
    "pointer",
  fontFamily:
    "inherit",
};

const addSpotIcon = {
  fontSize: "20px",
  lineHeight: 1,
};

const spotHelpText = {
  margin:
    "10px 0 0",
  textAlign:
    "center" as const,
  fontSize: "11px",
  color: "#8A9690",
};

////////////////////////////////////////////////
// 条件
////////////////////////////////////////////////

const conditionSection = {
  marginBottom: "32px",
  padding: "22px",
  borderRadius: "18px",
  background:
    "#F6F8F6",
  border:
    "1px solid #E2E8E4",
};

const conditionHeader = {
  marginBottom: "18px",
};

const conditionMini = {
  margin:
    "0 0 6px",
  fontSize: "11px",
  letterSpacing:
    "0.12em",
  color: "#829189",
};

const conditionTitle = {
  margin: "0",
  color: "#1F3D2B",
  fontSize: "20px",
};

const conditionText = {
  margin:
    "8px 0 0",
  color: "#69766F",
  fontSize: "13px",
  lineHeight: 1.7,
};

const conditionWrap = {
  display: "flex",
  flexWrap:
    "wrap" as const,
  gap: "9px",
};

const conditionBtn = {
  display:
    "inline-flex",
  alignItems:
    "center",
  gap: "8px",
  padding:
    "10px 14px",
  borderRadius:
    "999px",
  border:
    "1px solid #D8E0DB",
  background: "#fff",
  color:
    "#53645C",
  fontFamily:
    "inherit",
  fontSize: "13px",
  cursor:
    "pointer",
};

const conditionBtnSelected = {
  background:
    "#E4EFE8",
  borderColor:
    "#8FA89B",
  color:
    "#234436",
};

const conditionCheck = {
  width: "18px",
  height: "18px",
  display:
    "inline-flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  borderRadius:
    "50%",
  border:
    "1px solid #CBD5CF",
  fontSize: "11px",
};

const conditionCheckSelected = {
  background:
    "#1F3D2B",
  borderColor:
    "#1F3D2B",
  color: "#fff",
};

const selectedText = {
  margin:
    "14px 0 0",
  color:
    "#6C7A72",
  fontSize: "12px",
};

////////////////////////////////////////////////
// タグ
////////////////////////////////////////////////

const tagWrap = {
  display: "flex",
  flexWrap:
    "wrap" as const,
  gap: "9px",
};

const tagBtn = {
  padding:
    "9px 13px",
  borderRadius:
    "999px",
  border:
    "1px solid #D8E0DB",
  background:
    "#fff",
  color:
    "#52675C",
  cursor:
    "pointer",
  fontFamily:
    "inherit",
  fontSize:
    "13px",
};

////////////////////////////////////////////////
// 投稿ボタン
////////////////////////////////////////////////

const mainBtn = {
  width: "100%",
  padding: "16px",
  borderRadius:
    "999px",
  border: "none",
  background:
    "#1F3D2B",
  color: "#fff",
  fontWeight:
    "bold",
  fontSize: "16px",
  cursor:
    "pointer",
};

////////////////////////////////////////////////
// Toast
////////////////////////////////////////////////

const toast = {
  position:
    "fixed" as const,
  left: "50%",
  bottom: "30px",
  transform:
    "translateX(-50%)",
  padding:
    "14px 22px",
  borderRadius:
    "999px",
  background:
    "#1F3D2B",
  color: "#fff",
  fontSize: "14px",
  boxShadow:
    "0 8px 30px rgba(0,0,0,0.15)",
  zIndex: 100,
};