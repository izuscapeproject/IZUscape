"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { db, auth } from "@/lib/firebase";

import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

/* =========================================
   TYPE
========================================= */

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

/* =========================================
   AREA
========================================= */

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

/* =========================================
   EXPERIENCE
========================================= */

const EXPERIENCE_OPTIONS = [
  {
    id: "relax",
    number: "01",
    label: "ゆっくり過ごしたい",
    keywords: [
      "ゆっくり",
      "のんびり",
      "静か",
      "癒し",
      "落ち着く",
    ],
  },

  {
    id: "nature",
    number: "02",
    label: "自然を感じたい",
    keywords: [
      "自然",
      "山",
      "森",
      "川",
      "緑",
      "公園",
    ],
  },

  {
    id: "food",
    number: "03",
    label: "おいしいものを食べたい",
    keywords: [
      "グルメ",
      "食事",
      "ご飯",
      "料理",
      "カフェ",
      "スイーツ",
      "食べ",
    ],
  },

  {
    id: "sea",
    number: "04",
    label: "海を見たい",
    keywords: [
      "海",
      "海岸",
      "ビーチ",
      "砂浜",
      "港",
      "海水浴",
    ],
  },

  {
    id: "onsen",
    number: "05",
    label: "温泉に入りたい",
    keywords: [
      "温泉",
      "湯",
      "銭湯",
      "露天風呂",
    ],
  },

  {
    id: "photo",
    number: "06",
    label: "写真を撮りたい",
    keywords: [
      "写真",
      "絶景",
      "景色",
      "映え",
      "撮影",
      "夕日",
      "日の出",
    ],
  },

  {
    id: "view",
    number: "07",
    label: "絶景を見たい",
    keywords: [
      "絶景",
      "景色",
      "展望",
      "眺め",
      "夕日",
      "日の出",
    ],
  },

  {
    id: "history",
    number: "08",
    label: "歴史や文化に触れたい",
    keywords: [
      "歴史",
      "文化",
      "寺",
      "神社",
      "城",
      "資料館",
      "博物館",
    ],
  },

  {
    id: "active",
    number: "09",
    label: "体を動かしたい",
    keywords: [
      "ハイキング",
      "登山",
      "散歩",
      "サイクリング",
      "運動",
      "遊ぶ",
    ],
  },

  {
    id: "drive",
    number: "10",
    label: "ドライブしたい",
    keywords: [
      "ドライブ",
      "道路",
      "車",
      "ツーリング",
      "道",
    ],
  },

  {
    id: "cafe",
    number: "11",
    label: "カフェで過ごしたい",
    keywords: [
      "カフェ",
      "喫茶店",
      "コーヒー",
      "スイーツ",
    ],
  },

  {
    id: "quiet",
    number: "12",
    label: "静かな場所に行きたい",
    keywords: [
      "静か",
      "穴場",
      "人が少ない",
      "落ち着く",
    ],
  },

  {
    id: "free",
    number: "13",
    label: "お金をかけずに楽しみたい",
    keywords: [
      "無料",
      "0円",
      "お金をかけない",
      "公園",
      "散歩",
    ],
  },

  {
    id: "rain",
    number: "14",
    label: "雨の日でも楽しみたい",
    keywords: [
      "雨",
      "屋内",
      "室内",
      "美術館",
      "博物館",
      "カフェ",
    ],
  },

  {
    id: "solo",
    number: "15",
    label: "一人で楽しみたい",
    keywords: [
      "一人",
      "ひとり",
      "ソロ",
      "静か",
    ],
  },

  {
    id: "friends",
    number: "16",
    label: "友達と楽しみたい",
    keywords: [
      "友達",
      "友人",
      "グループ",
      "遊び",
    ],
  },

  {
    id: "family",
    number: "17",
    label: "家族で楽しみたい",
    keywords: [
      "家族",
      "子供",
      "子ども",
      "ファミリー",
    ],
  },
];

/* =========================================
   CONDITIONS
========================================= */

const CONDITION_OPTIONS = [
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

/* =========================================
   QUICK IDEAS
========================================= */

const QUICK_IDEAS = [
  "涼しいところでのんびりしたい",
  "絶景を見たい",
  "自然の中で過ごしたい",
  "学生でも気軽に楽しみたい",
];

/* =========================================
   COMMON FUNCTIONS
========================================= */

const getExperienceText = (post: Post) =>
  [post.description, ...(post.contents ?? [])]
    .filter(
      (text): text is string =>
        Boolean(text?.trim())
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

const getAreaName = (post: Post) =>
  post.area
    ? AREA_NAMES[post.area] ?? post.area
    : "伊豆";

const getPostHaystack = (post: Post) =>
  [
    post.title ?? "",
    post.area ?? "",
    getAreaName(post),
    ...(post.tags ?? []),
    getExperienceText(post),
  ]
    .join(" ")
    .toLowerCase();

/* =========================================
   HOME
========================================= */

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);

  const [keyword, setKeyword] = useState("");

  const [selectedArea, setSelectedArea] =
    useState("all");

  const [selectedExperiences, setSelectedExperiences] =
    useState<string[]>([]);

  const [selectedConditions, setSelectedConditions] =
    useState<string[]>([]);

  const [showExperienceAll, setShowExperienceAll] =
    useState(false);

  /*
   * 上の検索欄を開いているか
   */
  const [searchOpen, setSearchOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState<string | null>(null);

  const [savedPosts, setSavedPosts] =
    useState<string[]>([]);

  const [recommendations, setRecommendations] =
    useState<Post[]>([]);

  const [tripPickerPostId, setTripPickerPostId] =
    useState<string | null>(null);

  const [trips, setTrips] = useState<
    {
      id: string;
      title?: string;
      placeIds?: string[];
    }[]
  >([]);

  const [tripLoading, setTripLoading] =
    useState(false);

  const [createTripOpen, setCreateTripOpen] =
    useState(false);

  const [newTripTitle, setNewTripTitle] =
    useState("");

  const [pendingTripPostId, setPendingTripPostId] =
    useState<string | null>(null);

  /* =========================================
     AUTH
  ========================================= */

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(
          user?.uid ?? null
        );
      }
    );
  }, []);

  /* =========================================
     POSTS
  ========================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchPosts = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const timeout =
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () =>
                reject(
                  new Error("timeout")
                ),
              10000
            );
          });

        const snapshot =
          await Promise.race([
            getDocs(
              collection(db, "posts")
            ),
            timeout,
          ]);

        if (cancelled) return;

        const data =
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Post[];

        setPosts(data);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "[IZUscape] 投稿取得失敗:",
          error
        );

        setPosts([]);

        setLoadError(
          "場所の情報を読み込めませんでした。ネットワークやFirebaseの設定を確認してください。"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =========================================
     SAVED
  ========================================= */

  useEffect(() => {
    if (!currentUser) {
      setSavedPosts([]);
      setTrips([]);
      return;
    }

    const fetchSaved = async () => {
      try {
        const snapshot =
          await getDocs(
            query(
              collection(db, "saved"),
              where(
                "userId",
                "==",
                currentUser
              )
            )
          );

        setSavedPosts(
          snapshot.docs
            .map(
              (doc) =>
                doc.data().postId
            )
            .filter(Boolean)
        );
      } catch (error) {
        console.error(
          "[IZUscape] 保存データ取得失敗:",
          error
        );
      }
    };

    fetchSaved();
  }, [currentUser]);

  /* =========================================
     TRIPS
  ========================================= */

  useEffect(() => {
    if (!currentUser) return;

    const fetchTrips = async () => {
      try {
        const snapshot =
          await getDocs(
            query(
              collection(db, "trips"),
              where(
                "userId",
                "==",
                currentUser
              )
            )
          );

        setTrips(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as {
              title?: string;
              placeIds?: string[];
            }),
          }))
        );
      } catch (error) {
        console.error(
          "[IZUscape] 旅一覧取得失敗:",
          error
        );
      }
    };

    fetchTrips();
  }, [currentUser]);

  /* =========================================
     ADD POST TO TRIP
  ========================================= */

  const addPostToTrip = async (
    postId: string,
    tripId: string
  ) => {
    if (!currentUser) {
      alert(
        "旅に追加するにはログインしてください"
      );
      return;
    }

    const trip = trips.find(
      (item) => item.id === tripId
    );

    if (!trip) return;

    const currentPlaceIds =
      trip.placeIds ?? [];

    if (
      currentPlaceIds.includes(postId)
    ) {
      setTripPickerPostId(null);
      return;
    }

    setTripLoading(true);

    try {
      const nextPlaceIds = [
        ...currentPlaceIds,
        postId,
      ];

      await updateDoc(
        doc(db, "trips", tripId),
        {
          placeIds: nextPlaceIds,
          updatedAt:
            serverTimestamp(),
        }
      );

      setTrips((prev) =>
        prev.map((item) =>
          item.id === tripId
            ? {
                ...item,
                placeIds:
                  nextPlaceIds,
              }
            : item
        )
      );

      setTripPickerPostId(null);
    } catch (error) {
      console.error(
        "[IZUscape] 旅への追加失敗:",
        error
      );

      alert(
        "旅に追加できませんでした"
      );
    } finally {
      setTripLoading(false);
    }
  };

  /* =========================================
     CREATE TRIP
  ========================================= */

  const openCreateTrip = (
    postId?: string
  ) => {
    if (!currentUser) {
      alert(
        "旅を作るにはログインしてください"
      );
      return;
    }

    setPendingTripPostId(
      postId ?? null
    );

    setNewTripTitle("");
    setCreateTripOpen(true);
  };

  const createTripFromPost =
    async () => {
      if (!currentUser) {
        alert(
          "旅を作るにはログインしてください"
        );
        return;
      }

      const title =
        newTripTitle.trim();

      if (!title) {
        alert(
          "旅の名前を入力してください"
        );
        return;
      }

      setTripLoading(true);

      try {
        const placeIds =
          pendingTripPostId
            ? [pendingTripPostId]
            : [];

        const ref =
          await addDoc(
            collection(db, "trips"),
            {
              userId: currentUser,
              title,
              placeIds,
              createdAt:
                serverTimestamp(),
              updatedAt:
                serverTimestamp(),
            }
          );

        setTrips((prev) => [
          {
            id: ref.id,
            title,
            placeIds,
          },
          ...prev,
        ]);

        setTripPickerPostId(null);
        setCreateTripOpen(false);
        setPendingTripPostId(null);
        setNewTripTitle("");
      } catch (error) {
        console.error(
          "[IZUscape] 旅作成失敗:",
          error
        );

        alert(
          "旅を作成できませんでした"
        );
      } finally {
        setTripLoading(false);
      }
    };

  /* =========================================
     SAVE
  ========================================= */

  const toggleSave = async (
    postId: string
  ) => {
    if (!currentUser) {
      alert(
        "保存するにはログインしてください"
      );
      return;
    }

    try {
      const savedQuery =
        query(
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
          snapshot.docs.map(
            (doc) =>
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
        "[IZUscape] 保存失敗:",
        error
      );
    }
  };

  /* =========================================
     EXPERIENCE
  ========================================= */

  const toggleExperience = (
    experienceId: string
  ) => {
    setSelectedExperiences(
      (prev) =>
        prev.includes(experienceId)
          ? prev.filter(
              (id) =>
                id !== experienceId
            )
          : [
              ...prev,
              experienceId,
            ]
    );
  };

  /* =========================================
     CONDITIONS
  ========================================= */

  const toggleCondition = (
    condition: string
  ) => {
    setSelectedConditions(
      (prev) =>
        prev.includes(condition)
          ? prev.filter(
              (item) =>
                item !== condition
            )
          : [
              ...prev,
              condition,
            ]
    );
  };

  /* =========================================
     SEARCH SCORE
  ========================================= */

  const scoredPosts = useMemo(() => {
    const text =
      keyword.trim().toLowerCase();

    return posts
      .map((post, index) => {
        const haystack =
          getPostHaystack(post);

        let score = 50;

        /* AREA */

        if (
          selectedArea !== "all"
        ) {
          if (
            post.area ===
            selectedArea
          ) {
            score += 30;
          } else {
            score -= 25;
          }
        }

        /* KEYWORD */

        if (text) {
          const words =
            text
              .split(/\s+/)
              .filter(Boolean);

          let matched = 0;

          for (
            const word of words
          ) {
            if (
              haystack.includes(word)
            ) {
              matched++;
            }
          }

          if (
            words.length > 0
          ) {
            score += Math.round(
              (matched /
                words.length) *
                35
            );
          }
        }

        /* EXPERIENCE */

        for (
          const experienceId of
            selectedExperiences
        ) {
          const experience =
            EXPERIENCE_OPTIONS.find(
              (item) =>
                item.id ===
                experienceId
            );

          if (!experience)
            continue;

          const matched =
            experience.keywords.some(
              (keyword) =>
                haystack.includes(
                  keyword.toLowerCase()
                )
            );

          if (matched) {
            score += 25;
          } else {
            score -= 5;
          }
        }

        /* CONDITIONS */

        for (
          const condition of
            selectedConditions
        ) {
          if (
            haystack.includes(
              condition.toLowerCase()
            )
          ) {
            score += 15;
          } else {
            score -= 2;
          }
        }

        /* POST QUALITY */

        if (post.tags?.length) {
          score += Math.min(
            post.tags.length * 2,
            8
          );
        }

        if (post.images?.length) {
          score += 4;
        }

        if (
          getExperienceText(post)
        ) {
          score += 3;
        }

        /* DEFAULT */

        if (
          !text &&
          selectedArea ===
            "all" &&
          selectedExperiences.length ===
            0 &&
          selectedConditions.length ===
            0
        ) {
          score += Math.max(
            0,
            12 - index * 2
          );
        }

        return {
          post,
          score: Math.max(
            0,
            Math.min(99, score)
          ),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score
      );
  }, [
    posts,
    keyword,
    selectedArea,
    selectedExperiences,
    selectedConditions,
  ]);

  /* =========================================
     RECOMMENDATIONS
  ========================================= */

  useEffect(() => {
    setRecommendations(
      scoredPosts
        .slice(0, 6)
        .map(
          (item) => item.post
        )
    );
  }, [scoredPosts]);

  const todayPost =
    recommendations[0] ??
    posts[0] ??
    null;

  /* =========================================
     MEMORIES
  ========================================= */

  const visibleMemories =
    useMemo(
      () =>
        [...posts]
          .sort(
            (a, b) =>
              (b.createdAt
                ?.seconds ?? 0) -
              (a.createdAt
                ?.seconds ?? 0)
          )
          .slice(0, 3),
      [posts]
    );

  /* =========================================
     QUICK SEARCH
  ========================================= */

  const chooseIdea = (
    idea: string
  ) => {
    setKeyword(idea);

    setSearchOpen(true);

    window.setTimeout(() => {
      document
        .getElementById(
          "izu-search-panel"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
    }, 30);
  };

  /* =========================================
     RESET
  ========================================= */

  const resetSearch = () => {
    setKeyword("");
    setSelectedArea("all");
    setSelectedExperiences([]);
    setSelectedConditions([]);
  };

  const hasSearchCondition =
    Boolean(keyword.trim()) ||
    selectedArea !== "all" ||
    selectedExperiences.length >
      0 ||
    selectedConditions.length >
      0;

  const displayedExperiences =
    showExperienceAll
      ? EXPERIENCE_OPTIONS
      : EXPERIENCE_OPTIONS.slice(
          0,
          8
        );

  /* =========================================
     RENDER
  ========================================= */

  return (
    <main className="izu-home">

      {/* =====================================
          HERO
      ===================================== */}

      <section className="izu-hero">

        <div className="izu-hero-inner">

          <div className="izu-hero-copy">

            <p className="izu-eyebrow">
              IZUSCAPE
            </p>

            <h1>
              今日は、
              <br />
              <span>
                どんな時間を過ごしたい？
              </span>
            </h1>

            <p className="izu-hero-description">
              「行きたい場所」からではなく、
              <br />
              「やってみたいこと」から旅を見つける。
            </p>

            {/* =================================
                メイン検索
            ================================= */}

            <div
              className={
                searchOpen
                  ? "izu-main-search open"
                  : "izu-main-search"
              }
            >

              <div className="izu-idea-input">

                <span className="izu-idea-mark">
                  ⌕
                </span>

                <input
                  value={keyword}
                  onFocus={() =>
                    setSearchOpen(true)
                  }
                  onChange={(event) => {
                    setKeyword(
                      event.target.value
                    );

                    if (
                      !searchOpen
                    ) {
                      setSearchOpen(
                        true
                      );
                    }
                  }}
                  placeholder="例：涼しいところでのんびりしたい"
                  aria-label="したいことを入力"
                />

                {keyword && (
                  <button
                    type="button"
                    className="izu-clear-button"
                    onClick={() =>
                      setKeyword("")
                    }
                    aria-label="入力を消す"
                  >
                    ×
                  </button>
                )}

                <button
                  type="button"
                  className="izu-search-expand-button"
                  onClick={() =>
                    setSearchOpen(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    searchOpen
                      ? "検索条件を閉じる"
                      : "検索条件を開く"
                  }
                >
                  {searchOpen
                    ? "↑"
                    : "↓"}
                </button>

              </div>

              {/* QUICK IDEAS */}

              <div className="izu-idea-chips">

                {QUICK_IDEAS.map(
                  (idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() =>
                        chooseIdea(
                          idea
                        )
                      }
                    >
                      {idea}
                    </button>
                  )
                )}

              </div>

              {/* =================================
                  検索条件
              ================================= */}

              {searchOpen && (

                <div
                  id="izu-search-panel"
                  className="izu-search-panel"
                >

                  <div className="izu-search-panel-head">

                    <div>

                      <p className="izu-section-kicker">
                        FIND YOUR MOMENT
                      </p>

                      <h2>
                        こんな時間を過ごしたい
                      </h2>

                    </div>

                    {hasSearchCondition && (
                      <button
                        type="button"
                        className="izu-search-reset-top"
                        onClick={
                          resetSearch
                        }
                      >
                        条件をリセット
                      </button>
                    )}

                  </div>

                  {/* =================================
                      01 AREA
                  ================================= */}

                  <div className="izu-search-block">

                    <div className="izu-search-label-row">

                      <div>

                        <span className="izu-search-number">
                          01
                        </span>

                        <strong>
                          どこで探す？
                        </strong>

                      </div>

                      <span>
                        {selectedArea ===
                        "all"
                          ? "伊豆全域"
                          : AREA_NAMES[
                              selectedArea
                            ]}
                      </span>

                    </div>

                    <div className="izu-area-grid">

                      <button
                        type="button"
                        className={
                          selectedArea ===
                          "all"
                            ? "selected"
                            : ""
                        }
                        onClick={() =>
                          setSelectedArea(
                            "all"
                          )
                        }
                      >
                        伊豆全域
                      </button>

                      {Object.entries(
                        AREA_NAMES
                      ).map(
                        ([
                          id,
                          name,
                        ]) => (
                          <button
                            key={id}
                            type="button"
                            className={
                              selectedArea ===
                              id
                                ? "selected"
                                : ""
                            }
                            onClick={() =>
                              setSelectedArea(
                                id
                              )
                            }
                          >
                            {name}
                          </button>
                        )
                      )}

                    </div>

                  </div>

                  {/* =================================
                      02 EXPERIENCE
                  ================================= */}

                  <div className="izu-search-block">

                    <div className="izu-search-label-row">

                      <div>

                        <span className="izu-search-number">
                          02
                        </span>

                        <strong>
                          どんな時間？
                        </strong>

                      </div>

                      <span>
                        {selectedExperiences.length >
                        0
                          ? `${selectedExperiences.length}個選択`
                          : "複数選択できます"}
                      </span>

                    </div>

                    <div className="izu-experience-grid">

                      {displayedExperiences.map(
                        (
                          experience
                        ) => {

                          const selected =
                            selectedExperiences.includes(
                              experience.id
                            );

                          return (
                            <button
                              key={
                                experience.id
                              }
                              type="button"
                              className={
                                selected
                                  ? "selected"
                                  : ""
                              }
                              onClick={() =>
                                toggleExperience(
                                  experience.id
                                )
                              }
                            >

                              <span>
                                {
                                  experience.number
                                }
                              </span>

                              <strong>
                                {
                                  experience.label
                                }
                              </strong>

                              <b>
                                {selected
                                  ? "✓"
                                  : "↗"}
                              </b>

                            </button>
                          );
                        }
                      )}

                    </div>

                    <button
                      type="button"
                      className="izu-show-more-button"
                      onClick={() =>
                        setShowExperienceAll(
                          (prev) =>
                            !prev
                        )
                      }
                    >
                      {showExperienceAll
                        ? "項目を閉じる"
                        : "もっと見る"}

                      <span>
                        {showExperienceAll
                          ? "↑"
                          : "↓"}
                      </span>
                    </button>

                  </div>

                  {/* =================================
                      03 CONDITIONS
                  ================================= */}

                  <div className="izu-search-block">

                    <div className="izu-search-label-row">

                      <div>

                        <span className="izu-search-number">
                          03
                        </span>

                        <strong>
                          こんな条件で
                        </strong>

                      </div>

                      <span>
                        {selectedConditions.length >
                        0
                          ? `${selectedConditions.length}個選択`
                          : "必要なら選択"}
                      </span>

                    </div>

                    <div className="izu-condition-list">

                      {CONDITION_OPTIONS.map(
                        (
                          condition
                        ) => {

                          const selected =
                            selectedConditions.includes(
                              condition
                            );

                          return (
                            <button
                              key={
                                condition
                              }
                              type="button"
                              className={
                                selected
                                  ? "selected"
                                  : ""
                              }
                              onClick={() =>
                                toggleCondition(
                                  condition
                                )
                              }
                            >

                              <span>
                                {selected
                                  ? "✓"
                                  : "＋"}
                              </span>

                              {
                                condition
                              }

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>

                  {/* =================================
                      SEARCH SUMMARY
                  ================================= */}

                  {hasSearchCondition && (

                    <div className="izu-search-summary">

                      <div>

                        <p className="izu-section-kicker">
                          YOUR SEARCH
                        </p>

                        <h3>
                          条件に合う場所を探しています。
                        </h3>

                        <p>

                          {selectedArea ===
                          "all"
                            ? "伊豆全域"
                            : AREA_NAMES[
                                selectedArea
                              ]}

                          {selectedExperiences.length >
                            0 &&
                            ` · ${selectedExperiences
                              .map(
                                (
                                  id
                                ) =>
                                  EXPERIENCE_OPTIONS.find(
                                    (
                                      item
                                    ) =>
                                      item.id ===
                                      id
                                  )
                                    ?.label
                              )
                              .filter(
                                Boolean
                              )
                              .join(
                                "・"
                              )}`}

                          {selectedConditions.length >
                            0 &&
                            ` · ${selectedConditions.join(
                              "・"
                            )}`}

                        </p>

                      </div>

                    </div>

                  )}

                </div>

              )}

            </div>

          </div>

          {/* =================================
              HERO NOTE
          ================================= */}

          <div className="izu-hero-note">

            <span>
              DISCOVER
            </span>

            <p>
              自分ではまだ知らない
              <br />
              「行ってみたい」に出会う。
            </p>

            <Link
              href="/trip"
              className="izu-hero-trip-link"
            >
              旅をつくる{" "}
              <b>↗</b>
            </Link>

          </div>

        </div>

      </section>

      {/* =====================================
          TODAY
      ===================================== */}

      <section className="izu-today">

        <div className="izu-section-intro">

          <div>

            <p className="izu-section-kicker">
              TODAY
            </p>

            <h2>
              {hasSearchCondition
                ? "条件に合うおすすめ"
                : "今日のおすすめ"}
            </h2>

          </div>

          <p>

            {hasSearchCondition
              ? "選んだ条件に近い順に並べています。"
              : "季節や今の気分から、"}

            <br />

            {hasSearchCondition
              ? "あなたに合う場所を見つけよう。"
              : "ふと行きたくなる場所を。"}

          </p>

        </div>

        {todayPost ? (

          <Link
            href={`/experience/${todayPost.id}`}
            className="izu-feature"
          >

            <div className="izu-feature-image">

              {todayPost.images?.[0] ? (
                <img
                  src={
                    todayPost.images[0]
                  }
                  alt={
                    todayPost.title ||
                    "伊豆の場所"
                  }
                />
              ) : (
                <div className="izu-no-image">
                  IZUscape
                </div>
              )}

            </div>

            <div className="izu-feature-info">

              <div className="izu-feature-top">

                <span>
                  {getAreaName(
                    todayPost
                  )}
                </span>

                <strong>
                  {scoredPosts[0]
                    ?.score ?? 88}
                  %
                  <small>
                    {" "}
                    おすすめ
                  </small>
                </strong>

              </div>

              <h3>
                {todayPost.title ||
                  "伊豆のどこかへ"}
              </h3>

              <p className="izu-feature-experience">
                {getExperienceText(
                  todayPost
                ).slice(0, 150) ||
                  "ここでしかできない時間を、見つけてみよう。"}
              </p>

              <div className="izu-tag-row">

                {(
                  todayPost.tags ?? [
                    "自然",
                    "ゆっくり",
                  ]
                )
                  .slice(0, 4)
                  .map(
                    (tag) => (
                      <span
                        key={tag}
                      >
                        {tag}
                      </span>
                    )
                  )}

              </div>

              <span className="izu-detail-link">
                この場所を見てみる{" "}
                <b>↗</b>
              </span>

            </div>

          </Link>

        ) : (

          <div className="izu-feature-empty">

            <p>
              まだ場所の情報がありません。
            </p>

          </div>

        )}

      </section>

      {/* =====================================
          RECOMMENDATIONS
      ===================================== */}

      <section
        id="recommendations"
        className="izu-recommendations"
      >

        <div className="izu-section-intro">

          <div>

            <p className="izu-section-kicker">
              FOR YOU
            </p>

            <h2>
              {hasSearchCondition
                ? "こんなのはどうですか？"
                : "あなたに合いそうな場所"}
            </h2>

          </div>

          <p>
            {hasSearchCondition
              ? "今の希望に近い順に並べています。"
              : "まずは気になるものから。"}
          </p>

        </div>

        {loading ? (

          <div className="izu-loading">

            <span />

            <p>
              場所を探しています…
            </p>

          </div>

        ) : loadError ? (

          <div className="izu-empty">

            <h3>
              読み込めませんでした
            </h3>

            <p>
              {loadError}
            </p>

          </div>

        ) : recommendations.length ===
          0 ? (

          <div className="izu-empty">

            <h3>
              条件に合う候補がありません
            </h3>

            <p>
              条件を少し減らすと、
              <br />
              新しい場所が見つかるかもしれません。
            </p>

          </div>

        ) : (

          <div className="izu-place-grid">

            {recommendations.map(
              (
                post,
                index
              ) => {

                const score =
                  scoredPosts.find(
                    (item) =>
                      item.post.id ===
                      post.id
                  )?.score ?? 80;

                const saved =
                  savedPosts.includes(
                    post.id
                  );

                return (
                  <article
                    key={
                      post.id
                    }
                    className="izu-place-card"
                  >

                    <Link
                      href={`/experience/${post.id}`}
                      className="izu-place-image"
                    >

                      {post.images?.[0] ? (
                        <img
                          src={
                            post.images[0]
                          }
                          alt={
                            post.title ||
                            "伊豆の場所"
                          }
                        />
                      ) : (
                        <div className="izu-no-image">
                          IZUscape
                        </div>
                      )}

                      <span className="izu-place-area">
                        {getAreaName(
                          post
                        )}
                      </span>

                      <span className="izu-score">
                        {score}%
                      </span>

                    </Link>

                    <div className="izu-place-body">

                      <div className="izu-place-meta">

                        <span>
                          おすすめ{" "}
                          {index +
                            1}
                        </span>

                        <span>
                          ·
                        </span>

                        <span>
                          {post.userName ||
                            "みんなの体験"}
                        </span>

                      </div>

                      <Link
                        href={`/experience/${post.id}`}
                        className="izu-place-title"
                      >
                        {post.title ||
                          "旅の場所"}
                      </Link>

                      <div className="izu-place-tags">

                        {(
                          post.tags ??
                          []
                        )
                          .slice(
                            0,
                            3
                          )
                          .map(
                            (
                              tag
                            ) => (
                              <span
                                key={
                                  tag
                                }
                              >
                                {tag}
                              </span>
                            )
                          )}

                      </div>

                      <div className="izu-place-actions">

                        <Link
                          href={`/experience/${post.id}`}
                          className="izu-place-more"
                        >
                          詳細を見る
                        </Link>

                        <div className="izu-place-action-group">

                          <button
                            type="button"
                            className={
                              saved
                                ? "izu-save-button saved"
                                : "izu-save-button"
                            }
                            onClick={() =>
                              toggleSave(
                                post.id
                              )
                            }
                          >
                            {saved
                              ? "候補に保存済み"
                              : "今後の旅候補にする"}
                          </button>

                          <button
                            type="button"
                            className="izu-add-trip-button"
                            onClick={() => {

                              if (
                                !currentUser
                              ) {
                                alert(
                                  "旅に追加するにはログインしてください"
                                );
                                return;
                              }

                              setTripPickerPostId(
                                post.id
                              );

                            }}
                          >
                            ＋ 旅に追加
                          </button>

                        </div>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>

        )}

        <div className="izu-trip-bridge">

          <div>

            <p className="izu-section-kicker">
              YOUR TRIP
            </p>

            <h3>
              気になる場所が見つかったら、
              <br />
              そこから旅をつくれます。
            </h3>

          </div>

          <Link
            href="/trip"
            className="izu-trip-bridge-link"
          >
            旅をつくる{" "}
            <span>↗</span>
          </Link>

        </div>

      </section>

      {/* =====================================
          MEMORIES
      ===================================== */}

      <section className="izu-memories">

        <div className="izu-section-intro">

          <div>

            <p className="izu-section-kicker">
              REAL EXPERIENCES
            </p>

            <h2>
              実際に行った人の思い出
            </h2>

          </div>

          <p>
            説明文だけでは分からない、
            <br />
            その場所で過ごした時間。
          </p>

        </div>

        <div className="izu-memory-list">

          {visibleMemories.map(
            (post) => (

              <Link
                key={post.id}
                href={`/experience/${post.id}`}
                className="izu-memory-row"
              >

                <div className="izu-memory-thumb">

                  {post.images?.[0] ? (
                    <img
                      src={
                        post.images[0]
                      }
                      alt=""
                    />
                  ) : (
                    <span>
                      IZU
                    </span>
                  )}

                </div>

                <div className="izu-memory-copy">

                  <span>
                    {getAreaName(
                      post
                    )}
                  </span>

                  <h3>
                    {post.title ||
                      "旅の記録"}
                  </h3>

                  <p>

                    {getExperienceText(
                      post
                    ).slice(
                      0,
                      105
                    ) ||
                      "この場所での時間を残しました。"}

                    {getExperienceText(
                      post
                    ).length >
                      105
                      ? "…"
                      : ""}

                  </p>

                </div>

                <span className="izu-memory-arrow">
                  ↗
                </span>

              </Link>

            )
          )}

        </div>

      </section>

      {/* =====================================
          NEXT STEP
      ===================================== */}

      <section className="izu-next-step">

        <p className="izu-section-kicker">
          YOUR TRIP
        </p>

        <h2>
          見つけた場所から、
          <br />
          自分の旅をつくろう。
        </h2>

        <p>
          気になった場所をいくつか選んで、
          <br />
          自分だけの旅にまとめてみよう。
        </p>

        <Link
          href="/trip"
          className="izu-primary-button"
        >
          旅をつくる{" "}
          <span>↗</span>
        </Link>

      </section>

      {/* =====================================
          ADD TO TRIP MODAL
      ===================================== */}

      {tripPickerPostId && (

        <div
          className="izu-trip-picker-backdrop"
          onClick={() =>
            setTripPickerPostId(
              null
            )
          }
        >

          <div
            className="izu-trip-picker"
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="izu-trip-picker-head">

              <div>

                <p className="izu-section-kicker">
                  ADD TO TRIP
                </p>

                <h2>
                  どの旅に追加しますか？
                </h2>

              </div>

              <button
                type="button"
                className="izu-trip-picker-close"
                onClick={() =>
                  setTripPickerPostId(
                    null
                  )
                }
                aria-label="閉じる"
              >
                ×
              </button>

            </div>

            <div className="izu-trip-picker-list">

              {trips.map(
                (trip) => {

                  const alreadyAdded =
                    (
                      trip.placeIds ??
                      []
                    ).includes(
                      tripPickerPostId
                    );

                  return (
                    <button
                      key={
                        trip.id
                      }
                      type="button"
                      className="izu-trip-picker-item"
                      disabled={
                        tripLoading ||
                        alreadyAdded
                      }
                      onClick={() =>
                        addPostToTrip(
                          tripPickerPostId,
                          trip.id
                        )
                      }
                    >

                      <span>

                        <strong>
                          {trip.title ||
                            "伊豆の旅"}
                        </strong>

                        <small>
                          {
                            trip
                              .placeIds
                              ?.length ??
                            0
                          }
                          か所

                          {alreadyAdded
                            ? " · 追加済み"
                            : ""}
                        </small>

                      </span>

                      <b>
                        {alreadyAdded
                          ? "✓"
                          : "＋"}
                      </b>

                    </button>
                  );
                }
              )}

              <button
                type="button"
                className="izu-trip-picker-create"
                disabled={
                  tripLoading
                }
                onClick={() =>
                  openCreateTrip(
                    tripPickerPostId
                  )
                }
              >

                <span>

                  <strong>
                    新しい旅をつくる
                  </strong>

                  <small>
                    この場所を最初の候補にする
                  </small>

                </span>

                <b>
                  ＋
                </b>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =====================================
          CREATE TRIP MODAL
      ===================================== */}

      {createTripOpen && (

        <div
          className="izu-trip-picker-backdrop"
          onClick={() => {

            if (!tripLoading) {

              setCreateTripOpen(
                false
              );

              setNewTripTitle("");

              setPendingTripPostId(
                null
              );

            }

          }}
        >

          <div
            className="izu-trip-create-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="izu-trip-picker-head">

              <div>

                <p className="izu-section-kicker">
                  NEW TRIP
                </p>

                <h2>
                  どんな旅にしますか？
                </h2>

              </div>

              <button
                type="button"
                className="izu-trip-picker-close"
                onClick={() => {

                  if (
                    !tripLoading
                  ) {

                    setCreateTripOpen(
                      false
                    );

                    setNewTripTitle(
                      ""
                    );

                    setPendingTripPostId(
                      null
                    );

                  }

                }}
                aria-label="閉じる"
              >
                ×
              </button>

            </div>

            <p className="izu-trip-create-description">
              自分だけの名前をつけて、旅をはじめよう。
            </p>

            <label
              className="izu-trip-create-label"
              htmlFor="new-trip-title"
            >
              旅の名前
            </label>

            <input
              id="new-trip-title"
              className="izu-trip-create-input"
              value={
                newTripTitle
              }
              onChange={(
                event
              ) =>
                setNewTripTitle(
                  event.target
                    .value
                )
              }
              placeholder="例：伊豆半島をゆっくり巡る旅"
              maxLength={40}
              autoFocus
              onKeyDown={(
                event
              ) => {

                if (
                  event.key ===
                    "Enter" &&
                  !tripLoading
                ) {

                  event.preventDefault();

                  void createTripFromPost();

                }

              }}
            />

            <div className="izu-trip-create-footer">

              <button
                type="button"
                className="izu-trip-create-cancel"
                onClick={() => {

                  if (
                    !tripLoading
                  ) {

                    setCreateTripOpen(
                      false
                    );

                    setNewTripTitle(
                      ""
                    );

                    setPendingTripPostId(
                      null
                    );

                  }

                }}
              >
                キャンセル
              </button>

              <button
                type="button"
                className="izu-trip-create-confirm"
                onClick={() =>
                  void createTripFromPost()
                }
                disabled={
                  tripLoading ||
                  !newTripTitle.trim()
                }
              >

                {tripLoading
                  ? "作成中…"
                  : "この名前でつくる"}

                <span>
                  ↗
                </span>

              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}