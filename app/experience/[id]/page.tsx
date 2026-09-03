// app/experience/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/* =========================================================
   TYPE
========================================================= */

type Spot = {
  name?: string;
  content?: string;
  imageUrl?: string;
};

type Post = {
  id: string;

  postType?: "trip" | "place" | string;

  title?: string;
  area?: string;

  slug?: string;

  images?: string[];

  intro?: string;
  description?: string;
  contents?: string[];

  spot?: string;
  place?: string;
  location?: string;

  spotNames?: string[];
  spotImages?: string[];
  spots?: Spot[];

  tags?: string[];
  conditions?: string[];

  userId?: string;
  userName?: string;

  createdAt?: {
    seconds?: number;
  } | Date;

  reactions?: {
    want?: number;
    same?: number;
    nice?: number;

    // 過去データ対応
    like?: number;
    amazing?: number;
    scene?: number;
  };
};

/* =========================================================
   AREA
========================================================= */

const AREA_NAMES: Record<string, string> = {
  shimoda: "下田市",
  atami: "熱海市",
  ito: "伊東市",
  izu: "伊豆市",
  izunokuni: "伊豆の国市",
  higashiizu: "東伊豆町",
  kawazu: "河津町",
  minamiizu: "南伊豆町",
  matsuzaki: "松崎町",
  nishiizu: "西伊豆町",
  kannami: "函南町",
  mishima: "三島市",
  numazu: "沼津市",
};

/* =========================================================
   HELPERS
========================================================= */

function getAreaName(area?: string) {
  if (!area) return "伊豆";

  return AREA_NAMES[area] ?? area;
}

function getPostText(post: Post) {
  return [
    post.title,
    post.description,
    post.intro,
    ...(post.contents ?? []),
    ...(post.tags ?? []),
    ...(post.conditions ?? []),
    ...(post.spotNames ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function getSpotList(post: Post): Spot[] {
  /*
   * 新しい spots がある場合
   */
  if (
    Array.isArray(post.spots) &&
    post.spots.length > 0
  ) {
    return post.spots;
  }

  /*
   * 現在の投稿作成コードは
   * spotNames / spotImages を保存している
   */
  if (Array.isArray(post.spotNames)) {
    return post.spotNames.map(
      (name, index) => ({
        name,
        imageUrl:
          post.spotImages?.[index],
        content:
          post.contents?.[
            index + 1
          ],
      })
    );
  }

  return [];
}

function getMainDescription(post: Post) {
  if (post.description?.trim()) {
    return post.description.trim();
  }

  if (post.intro?.trim()) {
    return post.intro.trim();
  }

  if (post.contents?.[0]?.trim()) {
    return post.contents[0].trim();
  }

  return "";
}

/* =========================================================
   PAGE
========================================================= */

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();

  const postId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  /* =======================================================
     STATE
  ======================================================= */

  const [post, setPost] =
    useState<Post | null>(null);

  const [allPosts, setAllPosts] =
    useState<Post[]>([]);

  const [currentUser, setCurrentUser] =
    useState<string | null>(null);

  const [isSaved, setIsSaved] =
    useState(false);

  const [myReactions, setMyReactions] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [reactionLoading, setReactionLoading] =
    useState<string | null>(null);

  const [saveLoading, setSaveLoading] =
    useState(false);

  const [deleteLoading, setDeleteLoading] =
    useState(false);

  const [reactionError, setReactionError] =
    useState("");

  /* =======================================================
     AUTH
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(
            user?.uid ?? null
          );
        }
      );

    return () => unsubscribe();
  }, []);

  /* =======================================================
     POST LOAD
  ======================================================= */

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      setLoading(true);

      try {
        /*
         * まずID
         */
        const ref = doc(
          db,
          "posts",
          String(postId)
        );

        const snapshot =
          await getDoc(ref);

        if (snapshot.exists()) {
          setPost({
            id: snapshot.id,
            ...snapshot.data(),
          } as Post);

          setLoading(false);
          return;
        }

        /*
         * 次にslug
         */
        const q = query(
          collection(db, "posts"),
          where(
            "slug",
            "==",
            String(postId)
          )
        );

        const slugSnapshot =
          await getDocs(q);

        if (
          !slugSnapshot.empty
        ) {
          const item =
            slugSnapshot.docs[0];

          setPost({
            id: item.id,
            ...item.data(),
          } as Post);

          setLoading(false);
          return;
        }

        alert(
          "投稿が見つかりません"
        );
      } catch (error) {
        console.error(
          "[IZUscape] 投稿取得失敗:",
          error
        );

        alert(
          "投稿の読み込みに失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  /* =======================================================
     ALL POSTS
     関連投稿・投稿者の他の投稿に使用
  ======================================================= */

  useEffect(() => {
    const fetchAllPosts = async () => {
      try {
        const snapshot =
          await getDocs(
            collection(db, "posts")
          );

        const data =
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          ) as Post[];

        setAllPosts(data);
      } catch (error) {
        console.error(
          "[IZUscape] 投稿一覧取得失敗:",
          error
        );
      }
    };

    fetchAllPosts();
  }, []);

  /* =======================================================
     SAVED CHECK
  ======================================================= */

  useEffect(() => {
    if (
      !currentUser ||
      !post?.id
    ) {
      setIsSaved(false);
      return;
    }

    const checkSaved = async () => {
      try {
        const q = query(
          collection(db, "saved"),
          where(
            "userId",
            "==",
            currentUser
          ),
          where(
            "postId",
            "==",
            post.id
          )
        );

        const snapshot =
          await getDocs(q);

        setIsSaved(
          !snapshot.empty
        );
      } catch (error) {
        console.error(
          "[IZUscape] 保存状態取得失敗:",
          error
        );
      }
    };

    checkSaved();
  }, [currentUser, post?.id]);

  /* =======================================================
     MY REACTIONS
  ======================================================= */

  useEffect(() => {
    if (
      !currentUser ||
      !post?.id
    ) {
      setMyReactions([]);
      return;
    }

    const fetchMyReactions =
      async () => {
        try {
          const q = query(
            collection(db, "reactions"),
            where(
              "userId",
              "==",
              currentUser
            ),
            where(
              "postId",
              "==",
              post.id
            )
          );

          const snapshot =
            await getDocs(q);

          const types =
            snapshot.docs
              .map(
                (item) =>
                  item.data().type
              )
              .filter(
                Boolean
              );

          setMyReactions(types);
        } catch (error) {
          /*
           * reactions コレクションを
           * まだ使えない環境でも
           * ページ自体は表示できるようにする
           */
          console.error(
            "[IZUscape] リアクション取得失敗:",
            error
          );
        }
      };

    fetchMyReactions();
  }, [currentUser, post?.id]);

  /* =======================================================
     SAVE
  ======================================================= */

  const toggleSave = async () => {
    if (!currentUser) {
      alert(
        "保存するにはログインしてください"
      );
      return;
    }

    if (!post?.id) return;

    if (saveLoading) return;

    setSaveLoading(true);

    try {
      const q = query(
        collection(db, "saved"),
        where(
          "userId",
          "==",
          currentUser
        ),
        where(
          "postId",
          "==",
          post.id
        )
      );

      const snapshot =
        await getDocs(q);

      if (!snapshot.empty) {
        await Promise.all(
          snapshot.docs.map(
            (item) =>
              deleteDoc(item.ref)
          )
        );

        setIsSaved(false);
      } else {
        await addDoc(
          collection(db, "saved"),
          {
            userId: currentUser,
            postId: post.id,
            createdAt: Date.now(),
          }
        );

        setIsSaved(true);
      }
    } catch (error) {
      console.error(
        "[IZUscape] 保存失敗:",
        error
      );

      alert(
        "保存に失敗しました"
      );
    } finally {
      setSaveLoading(false);
    }
  };

  /* =======================================================
     REACTION
  ======================================================= */

  const handleReaction = async (
    type: "same" | "want" | "nice"
  ) => {
    setReactionError("");

    if (!currentUser) {
      alert(
        "リアクションするにはログインしてください"
      );
      return;
    }

    if (!post?.id) return;

    if (reactionLoading) return;

    setReactionLoading(type);

    try {
      /*
       * 自分のこの投稿への、この種類のリアクションを確認
       */
      const q = query(
        collection(db, "reactions"),
        where(
          "userId",
          "==",
          currentUser
        ),
        where(
          "postId",
          "==",
          post.id
        ),
        where(
          "type",
          "==",
          type
        )
      );

      const snapshot =
        await getDocs(q);

      /*
       * すでに押している場合
       * → リアクションを解除
       */
      if (!snapshot.empty) {
        await Promise.all(
          snapshot.docs.map(
            (item) =>
              deleteDoc(item.ref)
          )
        );

        const currentCount =
          Number(
            post.reactions?.[type] ??
              0
          );

        const nextCount =
          Math.max(
            0,
            currentCount - 1
          );

        const nextReactions = {
          ...(post.reactions ?? {}),
          [type]: nextCount,
        };

        await updateDoc(
          doc(
            db,
            "posts",
            post.id
          ),
          {
            reactions:
              nextReactions,
          }
        );

        /*
         * 画面を即時更新
         */
        setPost(
          (prev) =>
            prev
              ? {
                  ...prev,
                  reactions:
                    nextReactions,
                }
              : prev
        );

        setMyReactions(
          (prev) =>
            prev.filter(
              (item) =>
                item !== type
            )
        );

        return;
      }

      /*
       * まだ押していない場合
       * → リアクションを追加
       */
      await addDoc(
        collection(db, "reactions"),
        {
          userId: currentUser,
          postId: post.id,
          type,
          createdAt: Date.now(),
        }
      );

      const currentCount =
        Number(
          post.reactions?.[type] ??
            0
        );

      const nextReactions = {
        ...(post.reactions ?? {}),
        [type]:
          currentCount + 1,
      };

      await updateDoc(
        doc(
          db,
          "posts",
          post.id
        ),
        {
          reactions:
            nextReactions,
        }
      );

      /*
       * 画面を即時更新
       */
      setPost(
        (prev) =>
          prev
            ? {
                ...prev,
                reactions:
                  nextReactions,
              }
            : prev
      );

      setMyReactions(
        (prev) =>
          prev.includes(type)
            ? prev
            : [...prev, type]
      );
    } catch (error: any) {
      console.error(
        "[IZUscape] リアクション失敗:",
        error
      );

      setReactionError(
        "リアクションできませんでした。"
      );
    } finally {
      setReactionLoading(null);
    }
  };

  /* =======================================================
     DELETE POST
  ======================================================= */

  const handleDeletePost = async () => {
    if (!currentUser) {
      alert(
        "削除するにはログインしてください"
      );
      return;
    }

    if (!post?.id) return;

    /*
     * 念のためフロント側でも所有者を確認
     */
    if (post.userId !== currentUser) {
      alert(
        "自分の投稿だけ削除できます"
      );
      return;
    }

    if (deleteLoading) return;

    const confirmed = window.confirm(
      "この投稿を削除しますか？\n\n削除すると元に戻せません。"
    );

    if (!confirmed) return;

    setDeleteLoading(true);

    try {
      await deleteDoc(
        doc(
          db,
          "posts",
          post.id
        )
      );

      alert("投稿を削除しました。");
      router.push("/");
    } catch (error) {
      console.error(
        "[IZUscape] 投稿削除失敗:",
        error
      );

      alert(
        "投稿の削除に失敗しました。"
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  /* =======================================================
     RELATED POSTS
  ======================================================= */

  const relatedTrips =
    useMemo(() => {
      if (!post) return [];

      return allPosts
        .filter(
          (item) =>
            item.id !== post.id
        )
        .filter(
          (item) =>
            item.postType ===
            "trip"
        )
        .map((item) => {
          let score = 0;

          /*
           * 同じエリア
           */
          if (
            item.area &&
            item.area === post.area
          ) {
            score += 5;
          }

          /*
           * タグ共通
           */
          const postTags =
            post.tags ?? [];

          const itemTags =
            item.tags ?? [];

          score +=
            itemTags.filter(
              (tag) =>
                postTags.includes(tag)
            ).length * 2;

          return {
            item,
            score,
          };
        })
        .filter(
          ({ score }) =>
            score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 3)
        .map(
          ({ item }) =>
            item
        );
    }, [allPosts, post]);

  const relatedPlaces =
    useMemo(() => {
      if (!post) return [];

      /*
       * 旅投稿なら訪れたスポットに
       * 対応する場所投稿を優先。
       */
      const spotNames =
        getSpotList(post)
          .map(
            (spot) =>
              spot.name?.trim()
          )
          .filter(Boolean) as string[];

      return allPosts
        .filter(
          (item) =>
            item.id !== post.id
        )
        .filter(
          (item) =>
            item.postType ===
              "place" ||
            !item.postType
        )
        .map((item) => {
          let score = 0;

          if (
            item.area &&
            item.area === post.area
          ) {
            score += 5;
          }

          const itemText =
            getPostText(item);

          for (
            const spotName of spotNames
          ) {
            if (
              itemText.includes(
                spotName
              )
            ) {
              score += 8;
            }
          }

          const postTags =
            post.tags ?? [];

          const itemTags =
            item.tags ?? [];

          score +=
            itemTags.filter(
              (tag) =>
                postTags.includes(tag)
            ).length * 2;

          return {
            item,
            score,
          };
        })
        .filter(
          ({ score }) =>
            score > 0
        )
        .sort(
          (a, b) =>
            b.score - a.score
        )
        .slice(0, 3)
        .map(
          ({ item }) =>
            item
        );
    }, [allPosts, post]);

  /* =======================================================
     AUTHOR POSTS
  ======================================================= */

  const authorOtherTrips =
    useMemo(() => {
      if (!post?.userId) return [];

      return allPosts
        .filter(
          (item) =>
            item.id !== post.id
        )
        .filter(
          (item) =>
            item.userId ===
            post.userId
        )
        .filter(
          (item) =>
            item.postType ===
            "trip"
        )
        .slice(0, 3);
    }, [allPosts, post]);

  const authorOtherPlaces =
    useMemo(() => {
      if (!post?.userId) return [];

      return allPosts
        .filter(
          (item) =>
            item.id !== post.id
        )
        .filter(
          (item) =>
            item.userId ===
            post.userId
        )
        .filter(
          (item) =>
            item.postType ===
              "place" ||
            !item.postType
        )
        .slice(0, 3);
    }, [allPosts, post]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main style={page}>
        <div style={loadingBox}>
          <span style={eyebrow}>
            IZUSCAPE
          </span>

          <h1
            style={loadingTitle}
          >
            読み込んでいます…
          </h1>
        </div>
      </main>
    );
  }

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!post) {
    return (
      <main style={page}>
        <div style={notFound}>
          <span style={eyebrow}>
            IZUSCAPE
          </span>

          <h1
            style={notFoundTitle}
          >
            投稿が見つかりません
          </h1>

          <Link
            href="/"
            style={primaryButton}
          >
            ← ホームへ戻る
          </Link>
        </div>
      </main>
    );
  }

  /* =======================================================
     DATA
  ======================================================= */

  const isTrip =
    post.postType === "trip";

  const images =
    Array.isArray(post.images)
      ? post.images.filter(Boolean)
      : [];

  const spots =
    getSpotList(post);

  const description =
    getMainDescription(post);

  const conditions =
    Array.isArray(
      post.conditions
    )
      ? post.conditions
      : [];

  const tags =
    Array.isArray(post.tags)
      ? post.tags
      : [];

  /*
   * リアクション
   *
   * UI:
   * same = 参考になった
   * want = 行ってみたい
   * nice = いい旅だった
   */
  const reactionItems = [
    {
      type: "same" as const,
      icon: "◎",
      label: "参考になった",
      sub: "情報として役立った",
      count:
        Number(
          post.reactions?.same ??
            0
        ),
    },
    {
      type: "want" as const,
      icon: "⌖",
      label: "行ってみたい",
      sub: "自分も訪れてみたい",
      count:
        Number(
          post.reactions?.want ??
            0
        ),
    },
    {
      type: "nice" as const,
      icon: "✦",
      label: "いい旅だった",
      sub: "旅・投稿に共感した",
      count:
        Number(
          post.reactions?.nice ??
            0
        ),
    },
  ];

  /* =======================================================
     CARD
  ======================================================= */

  const renderPostCard = (
    item: Post
  ) => {
    const image =
      item.images?.[0] ||
      "/noimage.png";

    return (
      <Link
        key={item.id}
        href={`/experience/${item.id}`}
        style={postCard}
      >
        <div
          style={cardImageWrap}
        >
          <img
            src={image}
            alt={
              item.title ||
              "投稿写真"
            }
            style={cardImage}
          />

          <span
            style={cardType}
          >
            {item.postType ===
            "trip"
              ? "旅"
              : "場所"}
          </span>
        </div>

        <div
          style={cardBody}
        >
          <h3
            style={cardTitle}
          >
            {item.title ||
              "無題の投稿"}
          </h3>

          <p
            style={cardArea}
          >
            {getAreaName(
              item.area
            )}
          </p>

          <div
            style={
              cardBottom
            }
          >
            <span>
              {item.userName ||
                "匿名"}
            </span>

            <span>
              {Number(
                item.reactions
                  ?.want ?? 0
              ) > 0
                ? `⌖ ${
                    item.reactions
                      ?.want
                  }`
                : ""}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <main style={page}>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div
        className="izu-detail-content"
        style={content}
      >
        <Link
          href="/"
          style={back}
        >
          ← ホームに戻る
        </Link>

        {/* =================================================
            TITLE
        ================================================= */}

        <section
          style={topSection}
        >
          <div
            style={meta}
          >
            <span
              style={typeLabel}
            >
              {isTrip
                ? "旅の記録"
                : "場所の記録"}
            </span>

            <span>
              ·
            </span>

            <span>
              {getAreaName(
                post.area
              )}
            </span>
          </div>

          <h1
            className="izu-detail-title"
            style={title}
          >
            {post.title ||
              (isTrip
                ? "伊豆の旅"
                : "場所の記録")}
          </h1>

          <Link
            href={
              post.userId
                ? `/user/${post.userId}`
                : "#"
            }
            style={author}
          >
            <span
              style={avatar}
            >
              {(
                post.userName ||
                "匿名"
              ).slice(0, 1)}
            </span>

            <span>
              <small
                style={
                  authorSmall
                }
              >
                投稿者
              </small>

              <strong>
                {post.userName ||
                  "匿名"}
              </strong>
            </span>
          </Link>
        </section>

        {/* =================================================
            OWNER ACTION
        ================================================= */}

        {currentUser &&
          post.userId === currentUser && (
            <div
              style={ownerActionRow}
            >
              <button
                type="button"
                onClick={handleDeletePost}
                disabled={deleteLoading}
                style={deleteButton}
              >
                {deleteLoading
                  ? "削除中..."
                  : "この投稿を削除"}
              </button>

              <span
                style={deleteHint}
              >
                自分が投稿した内容のみ削除できます。
              </span>
            </div>
          )}

        {/* =================================================
            MAIN PHOTO
            切らない
        ================================================= */}

        {images.length > 0 && (
          <section
            style={heroWrap}
          >
            <img
              src={images[0]}
              alt={
                post.title ||
                "旅の写真"
              }
              style={heroImage}
            />

            {images.length >
              1 && (
              <span
                style={
                  photoCount
                }
              >
                {images.length}枚
              </span>
            )}
          </section>
        )}

        {/* =================================================
            BODY
        ================================================= */}

        <div
          className="izu-detail-grid"
          style={bodyGrid}
        >
          <article>
            {/* =============================================
                DESCRIPTION
            ============================================= */}

            {description && (
              <section
                style={section}
              >
                <span
                  style={sectionEyebrow}
                >
                  {isTrip
                    ? "TRIP STORY"
                    : "PLACE STORY"}
                </span>

                <h2
                  style={sectionTitle}
                >
                  {isTrip
                    ? "この旅について"
                    : "この場所について"}
                </h2>

                <p
                  style={descriptionText}
                >
                  {description}
                </p>
              </section>
            )}

            {/* =============================================
                PHOTOS
            ============================================= */}

            {images.length >
              1 && (
              <section
                style={section}
              >
                <span
                  style={sectionEyebrow}
                >
                  PHOTOS
                </span>

                <h2
                  style={sectionTitle}
                >
                  写真
                </h2>

                <div
                  style={
                    photoGrid
                  }
                >
                  {images
                    .slice(1)
                    .map(
                      (
                        image,
                        index
                      ) => (
                        <div
                          key={`${image}-${index}`}
                          style={
                            galleryCard
                          }
                        >
                          <img
                            src={image}
                            alt={`写真 ${
                              index + 2
                            }`}
                            style={
                              galleryImage
                            }
                          />
                        </div>
                      )
                    )}
                </div>
              </section>
            )}

            {/* =============================================
                SPOTS
            ============================================= */}

            {isTrip &&
              spots.length >
                0 && (
                <section
                  style={section}
                >
                  <span
                    style={
                      sectionEyebrow
                    }
                  >
                    SPOTS
                  </span>

                  <h2
                    style={
                      sectionTitle
                    }
                  >
                    訪れたスポット
                  </h2>

                  <div
                    style={
                      spotList
                    }
                  >
                    {spots.map(
                      (
                        spot,
                        index
                      ) => (
                        <div
                          key={`${spot.name}-${index}`}
                          style={
                            spotCard
                          }
                        >
                          <span
                            style={
                              spotNumber
                            }
                          >
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          {spot.imageUrl ? (
                            <img
                              src={
                                spot.imageUrl
                              }
                              alt={
                                spot.name ||
                                `スポット ${
                                  index + 1
                                }`
                              }
                              style={
                                spotImage
                              }
                            />
                          ) : (
                            <div
                              style={
                                spotEmpty
                              }
                            >
                              {index + 1}
                            </div>
                          )}

                          <div>
                            <h3
                              style={
                                spotName
                              }
                            >
                              {spot.name ||
                                `スポット ${
                                  index + 1
                                }`}
                            </h3>

                            {spot.content && (
                              <p
                                style={
                                  spotDescription
                                }
                              >
                                {
                                  spot.content
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}

            {/* =============================================
                CONDITIONS
            ============================================= */}

            {conditions.length >
              0 && (
              <section
                style={section}
              >
                <span
                  style={sectionEyebrow}
                >
                  CONDITIONS
                </span>

                <h2
                  style={
                    sectionTitle
                  }
                >
                  この投稿の条件
                </h2>

                <div
                  style={
                    tagList
                  }
                >
                  {conditions.map(
                    (
                      condition,
                      index
                    ) => (
                      <span
                        key={`${condition}-${index}`}
                        style={tag}
                      >
                        {typeof condition ===
                        "string"
                          ? condition
                          : ""}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

            {/* =============================================
                TAGS
            ============================================= */}

            {tags.length >
              0 && (
              <section
                style={smallSection}
              >
                <div
                  style={
                    tagList
                  }
                >
                  {tags.map(
                    (
                      tagItem,
                      index
                    ) => (
                      <span
                        key={`${tagItem}-${index}`}
                        style={
                          tagSecondary
                        }
                      >
                        #{tagItem}
                      </span>
                    )
                  )}
                </div>
              </section>
            )}

            {/* =============================================
                REACTIONS
            ============================================= */}

            <section
              style={
                reactionSection
              }
            >
              <span
                style={
                  sectionEyebrow
                }
              >
                REACTIONS
              </span>

              <h2
                style={
                  sectionTitle
                }
              >
                この投稿への反応
              </h2>

              <p
                style={
                  reactionLead
                }
              >
                気に入ったポイントを
                ひとつ選んで伝えられます。
              </p>

              <div
                className="izu-reaction-grid"
                style={
                  reactionGrid
                }
              >
                {reactionItems.map(
                  (reaction) => {
                    const active =
                      myReactions.includes(
                        reaction.type
                      );

                    const busy =
                      reactionLoading ===
                      reaction.type;

                    return (
                      <button
                        key={
                          reaction.type
                        }
                        type="button"
                        disabled={
                          Boolean(
                            reactionLoading
                          )
                        }
                        onClick={() =>
                          handleReaction(
                            reaction.type
                          )
                        }
                        style={{
                          ...reactionButton,
                          ...(active
                            ? reactionActive
                            : {}),
                        }}
                      >
                        <span
                          style={
                            reactionIcon
                          }
                        >
                          {
                            reaction.icon
                          }
                        </span>

                        <strong
                          style={
                            reactionLabel
                          }
                        >
                          {
                            reaction.label
                          }
                        </strong>

                        <span
                          style={
                            reactionSub
                          }
                        >
                          {
                            reaction.sub
                          }
                        </span>

                        <span
                          style={
                            reactionNumber
                          }
                        >
                          {busy
                            ? "…"
                            : reaction.count}
                        </span>

                        {active && (
                          <span
                            style={
                              reactionChecked
                            }
                          >
                            反応済み
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {reactionError && (
                <p
                  style={
                    errorText
                  }
                >
                  {reactionError}
                </p>
              )}

              {/* 保存 */}

              <div
                style={
                  saveRow
                }
              >
                <button
                  type="button"
                  onClick={
                    toggleSave
                  }
                  disabled={
                    saveLoading
                  }
                  style={{
                    ...saveButton,
                    ...(isSaved
                      ? saveActive
                      : {}),
                  }}
                >
                  <span>
                    {isSaved
                      ? "◆"
                      : "◇"}
                  </span>

                  <span>
                    {saveLoading
                      ? "保存中..."
                      : isSaved
                      ? "保存済み"
                      : "保存する"}
                  </span>
                </button>

                <span
                  style={
                    saveHint
                  }
                >
                  気になった投稿を
                  <br />
                  あとで見返せます。
                </span>
              </div>
            </section>
          </article>

          {/* =================================================
              SIDE
          ================================================= */}

          <aside
            className="izu-detail-side"
            style={side}
          >
            <div
              style={
                sideSticky
              }
            >
              <div
                style={
                  sideCard
                }
              >
                <span
                  style={
                    sideEyebrow
                  }
                >
                  {isTrip
                    ? "TRIP"
                    : "PLACE"}
                </span>

                <h3
                  style={
                    sideTitle
                  }
                >
                  {isTrip
                    ? "この旅から、\n次の旅へ。"
                    : "この場所から、\n次の旅へ。"}
                </h3>

                <p
                  style={
                    sideText
                  }
                >
                  誰かの旅の記録から、
                  次に訪れたい場所を
                  見つけてみよう。
                </p>

                <Link
                  href="/post"
                  style={
                    sideButton
                  }
                >
                  旅を記録する
                  <span>
                    ↗
                  </span>
                </Link>
              </div>

              <Link
                href="/"
                style={
                  sideBack
                }
              >
                ← ほかの投稿を見る
              </Link>
            </div>
          </aside>
        </div>

        {/* =================================================
            RELATED
        ================================================= */}

        {(relatedTrips.length >
          0 ||
          relatedPlaces.length >
            0) && (
          <section
            style={
              relatedSection
            }
          >
            <div
              style={
                relatedHead
              }
            >
              <span
                style={
                  sectionEyebrow
                }
              >
                DISCOVER MORE
              </span>

              <h2
                style={
                  relatedTitle
                }
              >
                もっと旅を探す
              </h2>
            </div>

            {relatedTrips.length >
              0 && (
              <div
                style={
                  relatedBlock
                }
              >
                <div
                  style={
                    relatedBlockHead
                  }
                >
                  <h3
                    style={
                      relatedBlockTitle
                    }
                  >
                    関連する旅
                  </h3>

                  <span
                    style={
                      relatedBlockHint
                    }
                  >
                    この旅と近い旅
                  </span>
                </div>

                <div
                  className="izu-card-grid"
                  style={
                    cardGrid
                  }
                >
                  {relatedTrips.map(
                    renderPostCard
                  )}
                </div>
              </div>
            )}

            {relatedPlaces.length >
              0 && (
              <div
                style={
                  relatedBlock
                }
              >
                <div
                  style={
                    relatedBlockHead
                  }
                >
                  <h3
                    style={
                      relatedBlockTitle
                    }
                  >
                    関連する場所
                  </h3>

                  <span
                    style={
                      relatedBlockHint
                    }
                  >
                    次に訪れたい場所
                  </span>
                </div>

                <div
                  className="izu-card-grid"
                  style={
                    cardGrid
                  }
                >
                  {relatedPlaces.map(
                    renderPostCard
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================================
            AUTHOR
        ================================================= */}

        {(authorOtherTrips.length >
          0 ||
          authorOtherPlaces.length >
            0) && (
          <section
            style={
              authorSection
            }
          >
            <div
              style={
                relatedHead
              }
            >
              <span
                style={
                  sectionEyebrow
                }
              >
                FROM THIS TRAVELER
              </span>

              <h2
                style={
                  relatedTitle
                }
              >
                {post.userName ||
                  "この投稿者"}
                のほかの投稿
              </h2>
            </div>

            {authorOtherTrips.length >
              0 && (
              <div
                style={
                  relatedBlock
                }
              >
                <div
                  style={
                    relatedBlockHead
                  }
                >
                  <h3
                    style={
                      relatedBlockTitle
                    }
                  >
                    ほかの旅
                  </h3>
                </div>

                <div
                  className="izu-card-grid"
                  style={
                    cardGrid
                  }
                >
                  {authorOtherTrips.map(
                    renderPostCard
                  )}
                </div>
              </div>
            )}

            {authorOtherPlaces.length >
              0 && (
              <div
                style={
                  relatedBlock
                }
              >
                <div
                  style={
                    relatedBlockHead
                  }
                >
                  <h3
                    style={
                      relatedBlockTitle
                    }
                  >
                    ほかの場所
                  </h3>
                </div>

                <div
                  className="izu-card-grid"
                  style={
                    cardGrid
                  }
                >
                  {authorOtherPlaces.map(
                    renderPostCard
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* =================================================
          RESPONSIVE
      ================================================= */}

      <style>{`
        .izu-detail-nav {
          display: flex;
        }

        .izu-detail-grid {
          grid-template-columns: minmax(0, 1fr) 235px;
        }

        .izu-reaction-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .izu-card-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        @media (max-width: 900px) {
          .izu-detail-grid {
            grid-template-columns: 1fr;
          }

          .izu-detail-side {
            display: none;
          }
        }

        @media (max-width: 680px) {
          .izu-detail-nav {
            display: none;
          }

          .izu-detail-content {
            width: calc(100% - 28px) !important;
          }

          .izu-detail-title {
            font-size: 36px !important;
          }

          .izu-reaction-grid {
            grid-template-columns: 1fr;
          }

          .izu-card-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 460px) {
          .izu-card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   PAGE
========================================================= */

const page: CSSProperties = {
  minHeight: "100vh",
  background: "#F7F9F7",
  color: "#1F3029",
  fontFamily: "inherit",
};

/* =========================================================
   HEADER
========================================================= */

const header: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  background:
    "rgba(255,255,255,0.94)",
  borderBottom:
    "1px solid #E2E8E4",
  backdropFilter:
    "blur(12px)",
};

const headerInner: CSSProperties = {
  width:
    "min(1120px, calc(100% - 40px))",
  minHeight: "68px",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  gap: "22px",
};

const logo: CSSProperties = {
  marginRight: "auto",
  textDecoration: "none",
  color: "#173F30",
  display: "flex",
  flexDirection: "column",
  lineHeight: 1,
};

const logoMain: CSSProperties = {
  fontSize: "20px",
  letterSpacing:
    "-0.05em",
};

const logoSub: CSSProperties = {
  marginTop: "5px",
  color: "#8C9B94",
  fontSize: "8px",
  letterSpacing:
    "0.16em",
};

const nav: CSSProperties = {
  alignItems: "center",
  gap: "21px",
};

const navLink: CSSProperties = {
  color: "#64736C",
  textDecoration: "none",
  fontSize: "11px",
  fontWeight: 600,
};

const postButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding:
    "10px 15px",
  borderRadius: "999px",
  background: "#173F30",
  color: "#fff",
  textDecoration: "none",
  fontSize: "10px",
  fontWeight: 700,
};

/* =========================================================
   CONTENT
========================================================= */

const content: CSSProperties = {
  width:
    "min(1120px, calc(100% - 40px))",
  margin: "0 auto",
  padding:
    "28px 0 80px",
};

const back: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  marginBottom: "24px",
  color: "#78877F",
  textDecoration: "none",
  fontSize: "10px",
};

const topSection: CSSProperties = {
  paddingBottom: "25px",
};

const meta: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: "#84928B",
  fontSize: "10px",
};

const typeLabel: CSSProperties = {
  color: "#3E6956",
  fontWeight: 700,
};

const title: CSSProperties = {
  maxWidth: "820px",
  margin:
    "10px 0 16px",
  fontSize:
    "clamp(34px, 5vw, 55px)",
  lineHeight: 1.08,
  letterSpacing:
    "-0.055em",
  fontWeight: 700,
};

const author: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "9px",
  color: "#43534C",
  textDecoration: "none",
  fontSize: "11px",
};

const avatar: CSSProperties = {
  width: "31px",
  height: "31px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#DFEAE3",
  color: "#315642",
  fontSize: "11px",
  fontWeight: 700,
};

const authorSmall: CSSProperties = {
  display: "block",
  marginBottom: "2px",
  color: "#9BA7A1",
  fontSize: "8px",
};

/* =========================================================
   HERO
========================================================= */

const heroWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  overflow: "hidden",
  borderRadius: "17px",
  background: "#EDF1EF",
};

const heroImage: CSSProperties = {
  display: "block",
  width: "100%",
  maxHeight: "370px",

  /*
   * 写真を切らない
   */
  height: "auto",
  objectFit: "contain",

  background: "#EDF1EF",
};

const photoCount: CSSProperties = {
  position: "absolute",
  right: "13px",
  bottom: "13px",
  padding:
    "6px 10px",
  borderRadius: "999px",
  background:
    "rgba(22,37,30,0.72)",
  color: "#fff",
  fontSize: "9px",
};

/* =========================================================
   BODY
========================================================= */

const bodyGrid: CSSProperties = {
  display: "grid",
  gap: "55px",
  marginTop: "44px",
};

const section: CSSProperties = {
  paddingBottom: "38px",
  marginBottom: "38px",
  borderBottom:
    "1px solid #E0E7E3",
};

const smallSection: CSSProperties = {
  paddingBottom: "22px",
};

const sectionEyebrow: CSSProperties = {
  display: "block",
  marginBottom: "6px",
  color: "#7C9186",
  fontSize: "8px",
  letterSpacing:
    "0.22em",
  fontWeight: 700,
};

const sectionTitle: CSSProperties = {
  margin: 0,
  color: "#21342B",
  fontSize: "22px",
  lineHeight: 1.35,
  letterSpacing:
    "-0.035em",
};

const descriptionText: CSSProperties = {
  maxWidth: "720px",
  margin:
    "17px 0 0",
  color: "#56655E",
  fontSize: "13px",
  lineHeight: 1.95,
  whiteSpace: "pre-wrap",
};

/* =========================================================
   PHOTOS
========================================================= */

const photoGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, 1fr)",
  gap: "9px",
  marginTop: "17px",
};

const galleryCard: CSSProperties = {
  overflow: "hidden",
  aspectRatio: "1.25 / 1",
  borderRadius: "11px",
  background: "#EDF1EF",
};

const galleryImage: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

/* =========================================================
   SPOTS
========================================================= */

const spotList: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "9px",
  marginTop: "17px",
};

const spotCard: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "28px 108px minmax(0,1fr)",
  alignItems: "center",
  gap: "12px",
  padding: "11px",
  background: "#fff",
  border:
    "1px solid #E1E8E4",
  borderRadius: "13px",
};

const spotNumber: CSSProperties = {
  color: "#98A59F",
  fontSize: "9px",
  fontWeight: 700,
};

const spotImage: CSSProperties = {
  width: "108px",
  height: "78px",
  objectFit: "cover",
  borderRadius: "9px",
  background: "#EDF1EF",
};

const spotEmpty: CSSProperties = {
  width: "108px",
  height: "78px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9px",
  background: "#EDF1EF",
  color: "#A2ADA8",
  fontSize: "15px",
};

const spotName: CSSProperties = {
  margin: 0,
  color: "#293A32",
  fontSize: "14px",
  fontWeight: 700,
};

const spotDescription: CSSProperties = {
  margin:
    "5px 0 0",
  color: "#7A8781",
  fontSize: "10px",
  lineHeight: 1.65,
};

/* =========================================================
   TAG
========================================================= */

const tagList: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginTop: "15px",
};

const tag: CSSProperties = {
  padding:
    "7px 10px",
  borderRadius: "999px",
  background: "#EDF4EF",
  border:
    "1px solid #D8E4DD",
  color: "#536C5F",
  fontSize: "9px",
};

const tagSecondary: CSSProperties = {
  padding:
    "6px 9px",
  borderRadius: "999px",
  background: "#fff",
  border:
    "1px solid #DFE6E2",
  color: "#78857F",
  fontSize: "9px",
};

/* =========================================================
   REACTION
========================================================= */

const reactionSection: CSSProperties = {
  paddingBottom: "8px",
};

const reactionLead: CSSProperties = {
  margin:
    "7px 0 16px",
  color: "#8A9891",
  fontSize: "10px",
};

const reactionGrid: CSSProperties = {
  display: "grid",
  gap: "9px",
};

const reactionButton: CSSProperties = {
  position: "relative",
  minHeight: "128px",
  padding: "14px",
  border:
    "1px solid #DFE7E2",
  borderRadius: "14px",
  background: "#fff",
  textAlign: "left",
  cursor: "pointer",
  color: "#33483E",
};

const reactionActive: CSSProperties = {
  background: "#EDF5F0",
  borderColor: "#A9C2B4",
  cursor: "pointer",
};

const reactionIcon: CSSProperties = {
  display: "block",
  marginBottom: "11px",
  color: "#3F7059",
  fontSize: "19px",
};

const reactionLabel: CSSProperties = {
  display: "block",
  fontSize: "11px",
};

const reactionSub: CSSProperties = {
  display: "block",
  marginTop: "5px",
  color: "#8A9891",
  fontSize: "8px",
};

const reactionNumber: CSSProperties = {
  display: "block",
  marginTop: "10px",
  color: "#1F4032",
  fontSize: "18px",
};

const reactionChecked: CSSProperties = {
  position: "absolute",
  top: "9px",
  right: "9px",
  color: "#6E8B7C",
  fontSize: "7px",
};

/* =========================================================
   SAVE
========================================================= */

const saveRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginTop: "13px",
  paddingTop: "13px",
  borderTop:
    "1px solid #E8EDEA",
};

const saveButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  minWidth: "138px",
  height: "42px",
  padding:
    "0 15px",
  border:
    "1px solid #B9CBC1",
  borderRadius: "999px",
  background: "#fff",
  color: "#355A48",
  fontSize: "10px",
  fontWeight: 700,
  cursor: "pointer",
};

const saveActive: CSSProperties = {
  background: "#E8F1EB",
  borderColor: "#9DB9AA",
};

const saveHint: CSSProperties = {
  color: "#929F99",
  fontSize: "8px",
  lineHeight: 1.6,
};

const errorText: CSSProperties = {
  margin:
    "10px 0 0",
  color: "#9A625A",
  fontSize: "9px",
};

/* =========================================================
   OWNER ACTION
========================================================= */

const ownerActionRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "22px",
};

const deleteButton: CSSProperties = {
  padding: "9px 13px",
  borderRadius: "999px",
  border: "1px solid #D8C4C0",
  background: "#fff",
  color: "#8B5E57",
  fontSize: "9px",
  fontWeight: 700,
  cursor: "pointer",
};

const deleteHint: CSSProperties = {
  color: "#9A9894",
  fontSize: "8px",
};

/* =========================================================
   SIDE
========================================================= */

const side: CSSProperties = {
  minWidth: 0,
};

const sideSticky: CSSProperties = {
  position: "sticky",
  top: "88px",
};

const sideCard: CSSProperties = {
  padding: "21px",
  borderRadius: "15px",
  background: "#EAF1ED",
};

const sideEyebrow: CSSProperties = {
  color: "#71897D",
  fontSize: "8px",
  letterSpacing:
    "0.2em",
  fontWeight: 700,
};

const sideTitle: CSSProperties = {
  margin:
    "11px 0 9px",
  whiteSpace: "pre-line",
  color: "#20352B",
  fontSize: "20px",
  lineHeight: 1.4,
  letterSpacing:
    "-0.035em",
};

const sideText: CSSProperties = {
  margin: 0,
  color: "#718078",
  fontSize: "9px",
  lineHeight: 1.8,
};

const sideButton: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: "16px",
  padding:
    "10px 13px",
  borderRadius: "999px",
  background: "#173F30",
  color: "#fff",
  textDecoration: "none",
  fontSize: "9px",
  fontWeight: 700,
};

const sideBack: CSSProperties = {
  display: "block",
  marginTop: "13px",
  color: "#77857E",
  textDecoration: "none",
  fontSize: "9px",
};

/* =========================================================
   RELATED / AUTHOR
========================================================= */

const relatedSection: CSSProperties = {
  marginTop: "55px",
  paddingTop: "45px",
  borderTop:
    "1px solid #DDE5E0",
};

const authorSection: CSSProperties = {
  marginTop: "55px",
  paddingTop: "45px",
  borderTop:
    "1px solid #DDE5E0",
};

const relatedHead: CSSProperties = {
  marginBottom: "23px",
};

const relatedTitle: CSSProperties = {
  margin: 0,
  color: "#20342B",
  fontSize: "25px",
  letterSpacing:
    "-0.04em",
};

const relatedBlock: CSSProperties = {
  marginBottom: "32px",
};

const relatedBlockHead: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "10px",
  marginBottom: "12px",
};

const relatedBlockTitle: CSSProperties = {
  margin: 0,
  color: "#33483E",
  fontSize: "15px",
};

const relatedBlockHint: CSSProperties = {
  color: "#97A29D",
  fontSize: "8px",
};

const cardGrid: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const postCard: CSSProperties = {
  display: "block",
  overflow: "hidden",
  borderRadius: "13px",
  background: "#fff",
  border:
    "1px solid #E0E7E3",
  color: "#25362E",
  textDecoration: "none",
  transition:
    "transform .18s ease, box-shadow .18s ease",
};

const cardImageWrap: CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "1.35 / 1",
  overflow: "hidden",
  background: "#EDF1EF",
};

const cardImage: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const cardType: CSSProperties = {
  position: "absolute",
  top: "8px",
  left: "8px",
  padding:
    "5px 8px",
  borderRadius: "999px",
  background:
    "rgba(255,255,255,.88)",
  color: "#4A6558",
  fontSize: "7px",
  fontWeight: 700,
};

const cardBody: CSSProperties = {
  padding: "11px",
};

const cardTitle: CSSProperties = {
  margin: 0,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient:
    "vertical",
  overflow: "hidden",
  color: "#293B33",
  fontSize: "12px",
  lineHeight: 1.45,
};

const cardArea: CSSProperties = {
  margin:
    "5px 0 9px",
  color: "#84918B",
  fontSize: "8px",
};

const cardBottom: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  color: "#A0AAA5",
  fontSize: "7px",
};

/* =========================================================
   LOADING
========================================================= */

const loadingBox: CSSProperties = {
  minHeight: "70vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
};

const eyebrow: CSSProperties = {
  color: "#789086",
  fontSize: "8px",
  letterSpacing:
    "0.24em",
  fontWeight: 700,
};

const loadingTitle: CSSProperties = {
  margin:
    "11px 0 0",
  color: "#2B3D35",
  fontSize: "20px",
};

const notFound: CSSProperties = {
  width:
    "min(600px, calc(100% - 40px))",
  minHeight: "70vh",
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const notFoundTitle: CSSProperties = {
  margin:
    "10px 0 20px",
  fontSize: "34px",
  letterSpacing:
    "-0.04em",
};

const primaryButton: CSSProperties = {
  width: "fit-content",
  padding:
    "10px 15px",
  borderRadius: "999px",
  background: "#173F30",
  color: "#fff",
  textDecoration: "none",
  fontSize: "10px",
};