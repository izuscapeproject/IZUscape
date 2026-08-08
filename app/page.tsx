"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { db, auth } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Post = {
  id: string;
  title?: string;
  area?: string;
  images?: string[];
  tags?: string[];
  userId?: string;
  userName?: string;
  contents?: string[];
  description?: string;
  createdAt?: {
    seconds?: number;
  };
  reactions?: {
    want?: number;
    same?: number;
    nice?: number;
    scene?: number;
  };
};

const AREA_NAMES: Record<string, string> = {
  shimoda: "下田",
  atami: "熱海",
  ito: "伊東",
  izu: "伊豆市",
  izunokuni: "伊豆の国",
  higashiizu: "東伊豆",
  kawazu: "河津",
  minamiizu: "南伊豆",
  matsuzaki: "松崎",
  nishiizu: "西伊豆",
  kannami: "函南",
  mishima: "三島",
  numazu: "沼津",
};

const QUICK_TAGS = [
  "海",
  "温泉",
  "カフェ",
  "絶景",
  "穴場",
];

export default function Home() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const [mode, setMode] =
    useState<"all" | "follow">("all");

  const [sortType, setSortType] =
    useState<"new" | "popular">("new");

  const [currentUser, setCurrentUser] =
    useState<string | null>(null);

  const [savedPosts, setSavedPosts] =
    useState<string[]>([]);

  const [randomPost, setRandomPost] =
    useState<Post | null>(null);

  // -----------------------------------------
  // Firebase Auth
  // -----------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user?.uid ?? null);
      }
    );

    return () => unsubscribe();
  }, []);

  // -----------------------------------------
  // 投稿取得
  // -----------------------------------------

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "posts")
        );

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        setPosts(data);

        if (data.length > 0) {
          setRandomPost(
            data[Math.floor(Math.random() * data.length)]
          );
        }
      } catch (error) {
        console.error(
          "投稿の取得に失敗しました",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // -----------------------------------------
  // 保存済み投稿取得
  // -----------------------------------------

  useEffect(() => {
    if (!currentUser) {
      setSavedPosts([]);
      return;
    }

    const fetchSaved = async () => {
      try {
        const savedQuery = query(
          collection(db, "saved"),
          where(
            "userId",
            "==",
            currentUser
          )
        );

        const snapshot =
          await getDocs(savedQuery);

        setSavedPosts(
          snapshot.docs
            .map((doc) => doc.data().postId)
            .filter(Boolean)
        );
      } catch (error) {
        console.error(
          "保存データの取得に失敗しました",
          error
        );
      }
    };

    fetchSaved();
  }, [currentUser]);

  // -----------------------------------------
  // 保存トグル
  // -----------------------------------------

  const toggleSave = async (
    postId: string
  ) => {
    if (!currentUser) {
      alert("保存するにはログインしてください");
      return;
    }

    try {
      const savedQuery = query(
        collection(db, "saved"),
        where(
          "userId",
          "==",
          currentUser
        ),
        where(
          "postId",
          "==",
          postId
        )
      );

      const snapshot =
        await getDocs(savedQuery);

      if (!snapshot.empty) {
        await Promise.all(
          snapshot.docs.map((doc) =>
            deleteDoc(doc.ref)
          )
        );

        setSavedPosts((prev) =>
          prev.filter(
            (id) => id !== postId
          )
        );
      } else {
        await addDoc(
          collection(db, "saved"),
          {
            userId: currentUser,
            postId,
          }
        );

        setSavedPosts((prev) => [
          ...prev,
          postId,
        ]);
      }
    } catch (error) {
      console.error(
        "保存に失敗しました",
        error
      );
    }
  };

  // -----------------------------------------
  // 体験文章
  // -----------------------------------------

  const getExperienceText = (
    post: Post
  ) => {
    return [
      post.description,
      ...(post.contents ?? []),
    ]
      .filter(
        (text): text is string =>
          Boolean(
            text &&
            text.trim()
          )
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // -----------------------------------------
  // エリア名
  // -----------------------------------------

  const getAreaName = (
    post: Post
  ) => {
    if (!post.area) return "伊豆";

    return (
      AREA_NAMES[post.area] ??
      post.area
    );
  };

  // -----------------------------------------
  // フォロー一覧
  // -----------------------------------------

  const followList = useMemo(() => {
    if (typeof window === "undefined") {
      return [] as string[];
    }

    try {
      return JSON.parse(
        localStorage.getItem("follow") ||
          "[]"
      ) as string[];
    } catch {
      return [] as string[];
    }
  }, []);

  // -----------------------------------------
  // フィルター・ソート
  // -----------------------------------------

  const filteredPosts = useMemo(() => {
    let result = posts.filter((post) => {
      if (
        mode === "follow" &&
        !followList.includes(
          post.userId ?? ""
        )
      ) {
        return false;
      }

      if (!keyword.trim()) {
        return true;
      }

      const searchText = [
        post.title ?? "",
        post.area ?? "",
        ...(post.tags ?? []),
        getExperienceText(post),
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(
        keyword
          .trim()
          .toLowerCase()
      );
    });

    result = [...result].sort(
      (a, b) => {
        if (sortType === "new") {
          return (
            (b.createdAt?.seconds ?? 0) -
            (a.createdAt?.seconds ?? 0)
          );
        }

        const score = (
          post: Post
        ) => {
          const reactions =
            post.reactions ?? {};

          return (
            (reactions.want ?? 0) +
            (reactions.same ?? 0) +
            (reactions.nice ?? 0) +
            (reactions.scene ?? 0)
          );
        };

        return score(b) - score(a);
      }
    );

    return result;
  }, [
    posts,
    keyword,
    mode,
    sortType,
    followList,
  ]);

  // -----------------------------------------
  // ランダムな思い出
  // -----------------------------------------

  const drawMemory = () => {
    if (posts.length === 0) {
      return;
    }

    const next =
      posts[
        Math.floor(
          Math.random() * posts.length
        )
      ];

    setRandomPost(next);
  };

  // -----------------------------------------
  // 表示
  // -----------------------------------------

  return (
    <div className="izu-home">

      {/* =====================================
          INTRO
      ===================================== */}

      <section className="izu-intro">

        <div className="izu-intro-inner">

          <p className="izu-eyebrow">
            IZUSCAPE
          </p>

          <h1 className="izu-main-title">
            みんなの
            <br />
            <em>旅きろく。</em>
          </h1>

          <p className="izu-intro-text">
            伊豆で過ごした、誰かの時間。
            <br />
            写真とことばから、
            <br className="mobile-only" />
            旅の記憶に出会おう。
          </p>

          <div className="izu-search">

            <span className="izu-search-icon">
              ⌕
            </span>

            <input
              value={keyword}
              onChange={(event) =>
                setKeyword(
                  event.target.value
                )
              }
              placeholder="思い出を探す"
              aria-label="思い出を検索"
            />

            {keyword && (
              <button
                type="button"
                className="izu-search-clear"
                onClick={() =>
                  setKeyword("")
                }
                aria-label="検索をクリア"
              >
                ×
              </button>
            )}

          </div>

          <div className="izu-quick-tags">

            {QUICK_TAGS.map(
              (tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setKeyword(tag)
                  }
                >
                  {tag}
                </button>
              )
            )}

          </div>

        </div>

      </section>

      {/* =====================================
          MEMORY OF THE DAY
      ===================================== */}

      {!keyword && randomPost && (
        <section className="izu-discovery">

          <div className="izu-section-head">

            <div>
              <p className="izu-section-kicker">
                DISCOVER
              </p>

              <h2>
                偶然の思い出に出会う
              </h2>
            </div>

            <button
              type="button"
              className="izu-text-button"
              onClick={drawMemory}
            >
              別の旅を見る
              <span>↗</span>
            </button>

          </div>

          <Link
            href={`/experience/${randomPost.id}`}
            className="izu-discovery-card"
          >

            <img
              src={
                randomPost.images?.[0]
              }
              alt={
                randomPost.title ||
                "伊豆の旅の写真"
              }
            />

            <div className="izu-discovery-overlay" />

            <div className="izu-discovery-content">

              <div className="izu-location">
                <span>●</span>
                {getAreaName(
                  randomPost
                )}
              </div>

              <h3>
                {randomPost.title ||
                  "旅の記録"}
              </h3>

              {getExperienceText(
                randomPost
              ) && (
                <p>
                  {getExperienceText(
                    randomPost
                  ).slice(0, 130)}
                  {getExperienceText(
                    randomPost
                  ).length > 130
                    ? "…"
                    : ""}
                </p>
              )}

              <span className="izu-discovery-author">
                {randomPost.userName ||
                  "匿名"}さんの旅
              </span>

            </div>

          </Link>

        </section>
      )}

      {/* =====================================
          FEED
      ===================================== */}

      <section className="izu-feed">

        <div className="izu-feed-top">

          <div>
            <p className="izu-section-kicker">
              MEMORIES
            </p>

            <h2>
              {keyword
                ? `「${keyword}」の旅きろく`
                : "みんなの旅きろく"}
            </h2>
          </div>

          <div className="izu-sort">

            <button
              type="button"
              className={
                sortType === "new"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSortType("new")
              }
            >
              新着
            </button>

            <button
              type="button"
              className={
                sortType === "popular"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setSortType(
                  "popular"
                )
              }
            >
              人気
            </button>

          </div>

        </div>

        <div className="izu-mode">

          <button
            type="button"
            className={
              mode === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("all")
            }
          >
            みんなの旅
          </button>

          <button
            type="button"
            className={
              mode === "follow"
                ? "active"
                : ""
            }
            onClick={() =>
              setMode("follow")
            }
          >
            フォロー中
          </button>

        </div>

        {loading ? (
          <div className="izu-loading">
            <span />
            <p>
              旅の記憶を集めています…
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="izu-empty">

            <div className="izu-empty-mark">
              ○
            </div>

            <h3>
              まだ旅が見つかりません
            </h3>

            <p>
              別のことばで探してみるか、
              <br />
              新しい旅を記録してみませんか？
            </p>

          </div>
        ) : (
          <div className="izu-memory-grid">

            {filteredPosts.map(
              (post) => {
                const experience =
                  getExperienceText(
                    post
                  );

                const saved =
                  savedPosts.includes(
                    post.id
                  );

                const reactionCount =
                  (post.reactions?.want ??
                    0) +
                  (post.reactions?.same ??
                    0) +
                  (post.reactions?.nice ??
                    0);

                return (
                  <article
                    key={post.id}
                    className="izu-memory-card"
                  >

                    <Link
                      href={`/experience/${post.id}`}
                      className="izu-card-image"
                    >

                      {post.images?.[0] ? (
                        <img
                          src={
                            post.images[0]
                          }
                          alt={
                            post.title ||
                            "旅の写真"
                          }
                        />
                      ) : (
                        <div className="izu-no-image">
                          IZUscape
                        </div>
                      )}

                      <span className="izu-card-location">
                        {getAreaName(
                          post
                        )}
                      </span>

                    </Link>

                    <div className="izu-card-content">

                      <div className="izu-card-meta">

                        <span>
                          {post.userName ||
                            "匿名"}
                        </span>

                        {post.tags?.[0] && (
                          <>
                            <span className="izu-meta-dot">
                              ·
                            </span>

                            <span>
                              #
                              {
                                post.tags[0]
                              }
                            </span>
                          </>
                        )}

                      </div>

                      <Link
                        href={`/experience/${post.id}`}
                        className="izu-card-title"
                      >
                        {post.title ||
                          "旅の記録"}
                      </Link>

                      {experience && (
                        <Link
                          href={`/experience/${post.id}`}
                          className="izu-card-story"
                        >
                          {experience.slice(
                            0,
                            115
                          )}
                          {experience.length >
                          115
                            ? "…"
                            : ""}
                        </Link>
                      )}

                      <div className="izu-card-bottom">

                        <span className="izu-card-reaction">
                          {reactionCount > 0
                            ? `${reactionCount}人の旅につながっています`
                            : "旅の記録を残しました"}
                        </span>

                        <button
                          type="button"
                          className={
                            saved
                              ? "izu-save saved"
                              : "izu-save"
                          }
                          onClick={() =>
                            toggleSave(
                              post.id
                            )
                          }
                          aria-label={
                            saved
                              ? "保存を解除"
                              : "保存する"
                          }
                        >
                          {saved
                            ? "♥"
                            : "♡"}
                        </button>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* =====================================
          ENDING
      ===================================== */}

      <section className="izu-ending">

        <div className="izu-ending-mark">
          <span />
        </div>

        <p className="izu-section-kicker">
          YOUR MEMORY
        </p>

        <h2>
          あなたの旅が、
          <br />
          誰かの旅になる。
        </h2>

        <p>
          思い出を残すことは、
          <br />
          次の誰かへ旅を渡すこと。
        </p>

        <Link
          href={
            currentUser
              ? "/post"
              : "/login"
          }
          className="izu-record-button"
        >
          旅を記録する
          <span>↗</span>
        </Link>

      </section>

    </div>
  );
}