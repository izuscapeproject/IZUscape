"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Post = {
  id: string;
  title?: string;
  area?: string;
  images?: string[];
  description?: string;
  tags?: string[];
};

type Trip = {
  id: string;
  title?: string;
  placeIds?: string[];
};

export default function Profile() {
  const params = useParams();
  const userId = params.user as string;

  // =========================================================
  // STATE
  // =========================================================

  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  const [currentUser, setCurrentUser] =
    useState<string | null>(null);

  const [isFollowing, setIsFollowing] =
    useState(false);

  const [followersCount, setFollowersCount] =
    useState(0);

  const [followingCount, setFollowingCount] =
    useState(0);

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] =
    useState<"posts" | "trips" | "saved">("posts");

  // =========================================================
  // AUTH
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user?.uid ?? null);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // USER
  // =========================================================

  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        const snap = await getDoc(
          doc(db, "users", userId)
        );

        if (snap.exists()) {
          setUserData(snap.data());
        }
      } catch (error) {
        console.error(
          "[IZUscape] ユーザー取得失敗:",
          error
        );
      }
    };

    fetchUser();
  }, [userId]);

  // =========================================================
  // POSTS
  // =========================================================

  useEffect(() => {
    if (!userId) return;

    const fetchPosts = async () => {
      try {
        const q = query(
          collection(db, "posts"),
          where("userId", "==", userId)
        );

        const snap = await getDocs(q);

        const data = snap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Post[];

        setPosts(data);
      } catch (error) {
        console.error(
          "[IZUscape] 投稿取得失敗:",
          error
        );
      }
    };

    fetchPosts();
  }, [userId]);

  // =========================================================
  // FOLLOW DATA
  // =========================================================

  useEffect(() => {
    if (!userId) return;

    const fetchFollowData = async () => {
      try {
        const followerSnap = await getDocs(
          query(
            collection(db, "follows"),
            where(
              "followingId",
              "==",
              userId
            )
          )
        );

        const followingSnap = await getDocs(
          query(
            collection(db, "follows"),
            where(
              "followerId",
              "==",
              userId
            )
          )
        );

        setFollowersCount(
          followerSnap.size
        );

        setFollowingCount(
          followingSnap.size
        );
      } catch (error) {
        console.error(
          "[IZUscape] フォロー情報取得失敗:",
          error
        );
      }
    };

    fetchFollowData();
  }, [userId]);

  // =========================================================
  // FOLLOW STATE
  // =========================================================

  useEffect(() => {
    if (!currentUser || !userId) return;

    if (currentUser === userId) {
      setIsFollowing(false);
      return;
    }

    const checkFollow = async () => {
      try {
        const q = query(
          collection(db, "follows"),
          where(
            "followerId",
            "==",
            currentUser
          ),
          where(
            "followingId",
            "==",
            userId
          )
        );

        const snap = await getDocs(q);

        setIsFollowing(
          !snap.empty
        );
      } catch (error) {
        console.error(
          "[IZUscape] フォロー状態取得失敗:",
          error
        );
      }
    };

    checkFollow();
  }, [currentUser, userId]);

  // =========================================================
  // SAVED
  // =========================================================

  useEffect(() => {
    if (!currentUser) {
      setSavedPosts([]);
      return;
    }

    // 保存は自分だけ
    if (currentUser !== userId) {
      setSavedPosts([]);
      return;
    }

    const fetchSaved = async () => {
      try {
        const savedSnap = await getDocs(
          query(
            collection(db, "saved"),
            where(
              "userId",
              "==",
              currentUser
            )
          )
        );

        const postIds = savedSnap.docs
          .map(
            (item) =>
              item.data().postId
          )
          .filter(Boolean) as string[];

        const results = await Promise.all(
          postIds.map(async (postId) => {
            const postSnap = await getDoc(
              doc(
                db,
                "posts",
                postId
              )
            );

            if (!postSnap.exists()) {
              return null;
            }

            return {
              id: postSnap.id,
              ...postSnap.data(),
            } as Post;
          })
        );

        setSavedPosts(
          results.filter(
            Boolean
          ) as Post[]
        );
      } catch (error) {
        console.error(
          "[IZUscape] 保存取得失敗:",
          error
        );
      }
    };

    fetchSaved();
  }, [currentUser, userId]);

  // =========================================================
  // TRIPS
  // =========================================================

  useEffect(() => {
    // 現在のFirestoreルールでは
    // tripsは本人だけ読めるため、自分のプロフィールのみ取得
    if (!currentUser || currentUser !== userId) {
      setTrips([]);
      return;
    }

    const fetchTrips = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "trips"),
            where(
              "userId",
              "==",
              userId
            )
          )
        );

        const data = snap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        ) as Trip[];

        setTrips(data);
      } catch (error) {
        console.error(
          "[IZUscape] 旅取得失敗:",
          error
        );
      }
    };

    fetchTrips();
  }, [currentUser, userId]);

  // =========================================================
  // FOLLOW / UNFOLLOW
  // =========================================================

  const toggleFollow = async () => {
    if (!currentUser) {
      alert("ログインしてください");
      return;
    }

    if (currentUser === userId) {
      return;
    }

    try {
      const q = query(
        collection(db, "follows"),
        where(
          "followerId",
          "==",
          currentUser
        ),
        where(
          "followingId",
          "==",
          userId
        )
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        await Promise.all(
          snap.docs.map(
            (item) =>
              deleteDoc(item.ref)
          )
        );

        setIsFollowing(false);

        setFollowersCount(
          (prev) =>
            Math.max(0, prev - 1)
        );
      } else {
        await addDoc(
          collection(db, "follows"),
          {
            followerId:
              currentUser,
            followingId:
              userId,
          }
        );

        setIsFollowing(true);

        setFollowersCount(
          (prev) => prev + 1
        );
      }
    } catch (error) {
      console.error(
        "[IZUscape] フォロー変更失敗:",
        error
      );

      alert(
        "フォローを変更できませんでした"
      );
    }
  };

  // =========================================================
  // PROFILE TYPE
  // =========================================================

  const isMyProfile =
    currentUser === userId;

  // =========================================================
  // TRIP PREVIEW
  // =========================================================

  const tripPreview = useMemo(() => {
    return trips.map((trip) => ({
      ...trip,
      count:
        trip.placeIds?.length ?? 0,
    }));
  }, [trips]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading && !userData) {
    return (
      <main style={container}>
        <p style={loadingText}>
          プロフィールを読み込んでいます…
        </p>
      </main>
    );
  }

  // =========================================================
  // RETURN
  // =========================================================

  return (
    <main style={container}>

      {/* 戻る */}
      <Link
        href="/"
        style={back}
      >
        ← ホーム
      </Link>

      {/* =====================================================
          PROFILE HEADER
      ===================================================== */}

      <section style={profileCard}>

        <div style={profileTop}>

          <img
            src={
              userData?.avatarUrl ||
              "/default.png"
            }
            alt="プロフィール画像"
            style={avatar}
          />

          <div style={profileInfo}>

            <h1 style={name}>
              {userData?.name ||
                "ユーザー"}
            </h1>

            <p style={bio}>
              {userData?.bio ||
                "まだ自己紹介がありません"}
            </p>

          </div>

        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div style={stats}>

          <div style={statItem}>
            <strong style={statNumber}>
              {posts.length}
            </strong>

            <span style={statLabel}>
              投稿
            </span>
          </div>

          <Link
            href={`/profile/${userId}/followers`}
            style={statItem}
          >
            <strong style={statNumber}>
              {followersCount}
            </strong>

            <span style={statLabel}>
              フォロワー
            </span>
          </Link>

          <Link
            href={`/profile/${userId}/following`}
            style={statItem}
          >
            <strong style={statNumber}>
              {followingCount}
            </strong>

            <span style={statLabel}>
              フォロー中
            </span>
          </Link>

        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div style={actions}>

          {isMyProfile ? (
            <>
              <Link
                href="/profile-edit"
                style={mainButton}
              >
                プロフィール編集
              </Link>

              <Link
                href="/profile-settings"
                style={settingButton}
              >
                ⚙ 設定
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={toggleFollow}
              style={{
                ...mainButton,
                cursor: "pointer",
              }}
            >
              {isFollowing
                ? "フォロー中"
                : "フォローする"}
            </button>
          )}

        </div>

      </section>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div style={tabs}>

        <button
          type="button"
          onClick={() =>
            setActiveTab("posts")
          }
          style={{
            ...tab,
            ...(activeTab === "posts"
              ? activeTabStyle
              : {}),
          }}
        >
          投稿
        </button>

        {isMyProfile && (
          <button
            type="button"
            onClick={() =>
              setActiveTab("trips")
            }
            style={{
              ...tab,
              ...(activeTab === "trips"
                ? activeTabStyle
                : {}),
            }}
          >
            旅
          </button>
        )}

        {isMyProfile && (
          <button
            type="button"
            onClick={() =>
              setActiveTab("saved")
            }
            style={{
              ...tab,
              ...(activeTab === "saved"
                ? activeTabStyle
                : {}),
            }}
          >
            保存
          </button>
        )}

      </div>

      {/* =====================================================
          POSTS
      ===================================================== */}

      {activeTab === "posts" && (
        <section>

          {posts.length === 0 ? (
            <Empty
              title="まだ投稿がありません"
              text="ここに旅の記録が表示されます"
            />
          ) : (
            <div style={grid}>

              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/experience/${post.id}`}
                  style={cardLink}
                >

                  <article style={card}>

                    <div style={imageWrap}>

                      <img
                        src={
                          post.images?.[0] ||
                          "/noimage.png"
                        }
                        alt={
                          post.title ||
                          "投稿"
                        }
                        style={image}
                      />

                    </div>

                    <div style={cardBody}>

                      <h2 style={cardTitle}>
                        {post.title ||
                          "無題の投稿"}
                      </h2>

                      {post.area && (
                        <p style={areaText}>
                          📍 {post.area}
                        </p>
                      )}

                    </div>

                  </article>

                </Link>
              ))}

            </div>
          )}

        </section>
      )}

      {/* =====================================================
          TRIPS
      ===================================================== */}

      {activeTab === "trips" &&
        isMyProfile && (
          <section>

            {tripPreview.length === 0 ? (
              <Empty
                title="まだ旅がありません"
                text="保存した場所から旅を作ってみよう"
              />
            ) : (
              <div style={tripGrid}>

                {tripPreview.map(
                  (trip) => (
                    <div
                      key={trip.id}
                      style={tripCard}
                    >

                      <div
                        style={
                          tripIcon
                        }
                      >
                        🗺️
                      </div>

                      <div
                        style={
                          tripContent
                        }
                      >

                        <h2
                          style={
                            tripTitle
                          }
                        >
                          {trip.title ||
                            "伊豆の旅"}
                        </h2>

                        <p
                          style={
                            tripCount
                          }
                        >
                          {trip.count}スポット
                        </p>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </section>
        )}

      {/* =====================================================
          SAVED
      ===================================================== */}

      {activeTab === "saved" &&
        isMyProfile && (
          <section>

            {savedPosts.length === 0 ? (
              <Empty
                title="保存した投稿がありません"
                text="気になる場所を保存してみよう"
              />
            ) : (
              <div style={grid}>

                {savedPosts.map(
                  (post) => (
                    <Link
                      key={post.id}
                      href={`/experience/${post.id}`}
                      style={cardLink}
                    >

                      <article
                        style={card}
                      >

                        <div
                          style={
                            imageWrap
                          }
                        >

                          <img
                            src={
                              post.images?.[0] ||
                              "/noimage.png"
                            }
                            alt={
                              post.title ||
                              "保存した投稿"
                            }
                            style={image}
                          />

                        </div>

                        <div
                          style={
                            cardBody
                          }
                        >

                          <h2
                            style={
                              cardTitle
                            }
                          >
                            {post.title ||
                              "無題の投稿"}
                          </h2>

                          {post.area && (
                            <p
                              style={
                                areaText
                              }
                            >
                              📍 {post.area}
                            </p>
                          )}

                        </div>

                      </article>

                    </Link>
                  )
                )}

              </div>
            )}

          </section>
        )}

    </main>
  );
}

// =========================================================
// EMPTY
// =========================================================

function Empty({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div style={empty}>
      <p style={emptyTitle}>
        {title}
      </p>

      <p style={emptyText}>
        {text}
      </p>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const container = {
  maxWidth: "860px",
  margin: "0 auto",
  padding: "24px 20px 100px",
};

const back = {
  color: "#66736D",
  textDecoration: "none",
  fontSize: "13px",
};

const loadingText = {
  textAlign: "center" as const,
  color: "#777",
  padding: "60px 0",
};

const profileCard = {
  marginTop: "18px",
  padding: "24px 22px",
  background: "#fff",
  borderRadius: "20px",
  boxShadow:
    "0 5px 18px rgba(31,61,43,0.06)",
};

const profileTop = {
  display: "flex",
  alignItems: "center",
  gap: "18px",
};

const avatar = {
  width: "82px",
  height: "82px",
  borderRadius: "50%",
  objectFit: "cover" as const,
  flexShrink: 0,
};

const profileInfo = {
  minWidth: 0,
};

const name = {
  margin: "0 0 6px",
  fontSize: "23px",
  fontWeight: "700",
  color: "#1F3D2B",
};

const bio = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.6,
  color: "#68736E",
};

const stats = {
  display: "flex",
  justifyContent: "center",
  marginTop: "22px",
  borderTop: "1px solid #EEF1EF",
  paddingTop: "18px",
};

const statItem = {
  flex: 1,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  textDecoration: "none",
  color: "#1F3D2B",
};

const statNumber = {
  fontSize: "17px",
};

const statLabel = {
  marginTop: "3px",
  fontSize: "11px",
  color: "#7A8782",
};

const actions = {
  display: "flex",
  justifyContent: "center",
  gap: "8px",
  marginTop: "20px",
};

const mainButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "150px",
  padding: "9px 18px",
  borderRadius: "999px",
  border: "none",
  background: "#1F4D36",
  color: "#fff",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: "700",
};

const settingButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "9px 15px",
  borderRadius: "999px",
  border: "1px solid #DCE4DF",
  background: "#fff",
  color: "#44534C",
  textDecoration: "none",
  fontSize: "12px",
};

const tabs = {
  display: "flex",
  marginTop: "22px",
  borderBottom: "1px solid #E5EAE7",
};

const tab = {
  flex: 1,
  padding: "11px 8px",
  border: "none",
  background: "transparent",
  color: "#8A948F",
  fontSize: "13px",
  fontWeight: "600",
  cursor: "pointer",
};

const activeTabStyle = {
  color: "#1F3D2B",
  borderBottom:
    "2px solid #1F3D2B",
};

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fill, minmax(180px, 1fr))",
  gap: "12px",
  marginTop: "16px",
};

const cardLink = {
  textDecoration: "none",
  color: "inherit",
};

const card = {
  overflow: "hidden",
  background: "#fff",
  borderRadius: "14px",
  border: "1px solid #EEF1EF",
  transition: "transform 0.15s",
};

const imageWrap = {
  width: "100%",
  aspectRatio: "4 / 3",
  overflow: "hidden",
  background: "#F1F3F2",
};

const image = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
  display: "block",
};

const cardBody = {
  padding: "10px 11px 11px",
};

const cardTitle = {
  margin: 0,
  fontSize: "13px",
  fontWeight: "700",
  lineHeight: 1.45,
  color: "#26352E",
};

const areaText = {
  margin: "5px 0 0",
  fontSize: "10px",
  color: "#7A8782",
};

const tripGrid = {
  display: "grid",
  gap: "10px",
  marginTop: "16px",
};

const tripCard = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "15px",
  background: "#fff",
  border: "1px solid #EEF1EF",
  borderRadius: "14px",
};

const tripIcon = {
  width: "44px",
  height: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  background: "#F1F5F2",
  fontSize: "21px",
};

const tripContent = {
  minWidth: 0,
};

const tripTitle = {
  margin: 0,
  fontSize: "14px",
  color: "#26352E",
};

const tripCount = {
  margin: "4px 0 0",
  fontSize: "11px",
  color: "#7A8782",
};

const empty = {
  marginTop: "35px",
  padding: "35px 20px",
  textAlign: "center" as const,
  background: "#FAFBFA",
  borderRadius: "16px",
};

const emptyTitle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "700",
  color: "#46544D",
};

const emptyText = {
  margin: "7px 0 0",
  fontSize: "12px",
  color: "#89938F",
};