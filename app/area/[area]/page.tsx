"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import PostCard from "@/app/components/PostCard";

type Post = {
  id: string;
  title?: string;
  area?: string;
  images?: string[];
  tags?: string[];
  slug?: string;
  description?: string;
};

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

/*
  「探す」の切り口。

  実際の投稿についている tags と
  一致するものだけで絞り込みます。
*/

const DISCOVERY_CATEGORIES = [
  {
    id: "relax",
    label: "ゆっくり過ごしたい",
    keywords: [
      "ゆっくり",
      "のんびり",
      "落ち着く",
      "癒し",
      "リラックス",
    ],
  },
  {
    id: "nature",
    label: "自然を感じたい",
    keywords: [
      "自然",
      "山",
      "森",
      "緑",
      "川",
      "滝",
    ],
  },
  {
    id: "food",
    label: "おいしいものを食べたい",
    keywords: [
      "グルメ",
      "食",
      "料理",
      "ランチ",
      "カフェ",
      "スイーツ",
      "ごはん",
    ],
  },
  {
    id: "sea",
    label: "海を見たい",
    keywords: [
      "海",
      "ビーチ",
      "海岸",
      "海辺",
      "浜",
      "絶景",
    ],
  },
  {
    id: "onsen",
    label: "温泉に入りたい",
    keywords: [
      "温泉",
      "露天風呂",
      "銭湯",
      "湯",
    ],
  },
  {
    id: "photo",
    label: "写真を撮りたい",
    keywords: [
      "写真",
      "フォト",
      "絶景",
      "景色",
      "映え",
    ],
  },
] as const;

export default function AreaPage() {
  const params = useParams();

  const area = params.area as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const areaName =
    AREA_NAMES[area] || area;

  /*
    ==========================================
    投稿取得
    ==========================================
  */

  useEffect(() => {
    if (!area) return;

    const fetchPosts = async () => {
      setLoading(true);
      setError("");

      try {
        const q = query(
          collection(db, "posts"),
          where("area", "==", area)
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Post[];

        setPosts(data);
      } catch (err) {
        console.error(
          "[IZUscape] 投稿取得失敗:",
          err
        );

        setError(
          "場所を読み込めませんでした。"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [area]);

  /*
    ==========================================
    タグによる絞り込み
    ==========================================
  */

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "all") {
      return posts;
    }

    const category =
      DISCOVERY_CATEGORIES.find(
        (item) =>
          item.id === selectedCategory
      );

    if (!category) {
      return posts;
    }

    return posts.filter((post) => {
      const tags = post.tags ?? [];

      return tags.some((tag) =>
        category.keywords.some(
          (keyword) =>
            tag.includes(keyword) ||
            keyword.includes(tag)
        )
      );
    });
  }, [
    posts,
    selectedCategory,
  ]);

  /*
    ==========================================
    選択中カテゴリ名
    ==========================================
  */

  const selectedCategoryLabel =
    selectedCategory === "all"
      ? "すべての思い出"
      : DISCOVERY_CATEGORIES.find(
          (item) =>
            item.id === selectedCategory
        )?.label ?? "すべての思い出";

  /*
    ==========================================
    UI
    ==========================================
  */

  return (
    <main className="izu-discover-page">

      {/* =====================================
          HERO
      ===================================== */}

      <section className="izu-discover-hero">

        <div className="izu-discover-hero-inner">

          <p className="izu-section-kicker">
            DISCOVER IZU
          </p>

          <h1>
            伊豆で、
            <br />
            <em>何をしたい？</em>
          </h1>

          <p className="izu-discover-lead">
            観光地から探すのではなく、
            <br />
            今日の気分から、まだ知らない場所を見つけよう。
          </p>

        </div>

      </section>

      {/* =====================================
          DISCOVERY CATEGORY
      ===================================== */}

      <section className="izu-discover-section">

        <div className="izu-discover-section-head">

          <div>
            <p className="izu-section-kicker">
              FIND YOUR MOMENT
            </p>

            <h2>
              こんな時間を過ごしたい
            </h2>
          </div>

          <span className="izu-discover-area">
            {areaName}
          </span>

        </div>

        <div className="izu-discover-categories">

          <button
            type="button"
            className={
              selectedCategory === "all"
                ? "izu-discover-category active"
                : "izu-discover-category"
            }
            onClick={() =>
              setSelectedCategory("all")
            }
          >
            <span className="izu-discover-category-number">
              00
            </span>

            <strong>
              すべて見る
            </strong>

            <span className="izu-discover-category-arrow">
              ↗
            </span>
          </button>

          {DISCOVERY_CATEGORIES.map(
            (category, index) => (
              <button
                key={category.id}
                type="button"
                className={
                  selectedCategory ===
                  category.id
                    ? "izu-discover-category active"
                    : "izu-discover-category"
                }
                onClick={() =>
                  setSelectedCategory(
                    category.id
                  )
                }
              >
                <span className="izu-discover-category-number">
                  {String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </span>

                <strong>
                  {category.label}
                </strong>

                <span className="izu-discover-category-arrow">
                  ↗
                </span>
              </button>
            )
          )}

        </div>

      </section>

      {/* =====================================
          RESULTS
      ===================================== */}

      <section className="izu-discover-results">

        <div className="izu-discover-results-head">

          <div>

            <p className="izu-section-kicker">
              MEMORIES IN {areaName}
            </p>

            <h2>
              {selectedCategoryLabel}
            </h2>

          </div>

          <span className="izu-discover-count">
            {filteredPosts.length}件
          </span>

        </div>

        {/* ===================================
            LOADING
        =================================== */}

        {loading && (
          <div className="izu-discover-message">
            <span>
              読み込み中…
            </span>
          </div>
        )}

        {/* ===================================
            ERROR
        =================================== */}

        {!loading && error && (
          <div className="izu-discover-message">
            <span>
              {error}
            </span>
          </div>
        )}

        {/* ===================================
            NO RESULT
        =================================== */}

        {!loading &&
          !error &&
          filteredPosts.length === 0 && (
            <div className="izu-discover-empty">

              <span>
                まだ見つかっていません。
              </span>

              <h3>
                別の気分から
                <br />
                探してみよう。
              </h3>

              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    "all"
                  )
                }
              >
                すべての思い出を見る
                <span>↗</span>
              </button>

            </div>
          )}

        {/* ===================================
            POST GRID
        =================================== */}

        {!loading &&
          !error &&
          filteredPosts.length > 0 && (
            <div className="izu-discover-grid">

              {filteredPosts.map(
                (post) => (
                  <article
                    key={post.id}
                    className="izu-discover-card"
                  >
                    <PostCard
                      post={{
                        id: post.id,

                        // undefined対策
                        title:
                          post.title ?? "",

                        imageUrl:
                          post.images?.[0] ||
                          "",

                        // undefined対策
                        slug:
                          post.slug ?? "",
                      }}
                    />
                  </article>
                )
              )}

            </div>
          )}

      </section>

    </main>
  );
}