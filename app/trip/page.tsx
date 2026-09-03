"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type Post = {
  id: string;
  title?: string;
  area?: string;
  images?: string[];
  tags?: string[];
  description?: string;
};

type Trip = {
  id: string;
  title?: string;
  placeIds?: string[];
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

const getAreaName = (post: Post) =>
  post.area ? AREA_NAMES[post.area] ?? post.area : "伊豆";

export default function TripPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [tripTitle, setTripTitle] = useState("伊豆の旅");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // =========================================================
  // ADD TO TRIP MODAL
  // =========================================================

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [addingToTrip, setAddingToTrip] = useState(false);

  // =========================================================
  // AUTH
  // =========================================================

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
    });
  }, []);

  // =========================================================
  // LOAD DATA
  // =========================================================

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);

      try {
        const [savedSnapshot, postsSnapshot, tripsSnapshot] =
          await Promise.all([
            getDocs(
              query(
                collection(db, "saved"),
                where("userId", "==", userId)
              )
            ),

            getDocs(collection(db, "posts")),

            getDocs(
              query(
                collection(db, "trips"),
                where("userId", "==", userId)
              )
            ),
          ]);

        // =====================================================
        // 保存した投稿
        // =====================================================

        const ids = savedSnapshot.docs
          .map((item) => item.data().postId)
          .filter(Boolean) as string[];

        // =====================================================
        // 投稿
        // =====================================================

        const allPosts = postsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Post[];

        // =====================================================
        // 旅
        // =====================================================

        const allTrips = tripsSnapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Trip[];

        setSavedIds(ids);
        setPosts(allPosts);
        setTrips(allTrips);

        // =====================================================
        // 最後に選択していた旅を復元
        // =====================================================

        if (allTrips.length > 0) {
          const storageKey = `izuscape_active_trip_${userId}`;
          const savedTripId = localStorage.getItem(storageKey);

          const savedTrip = savedTripId
            ? allTrips.find(
                (trip) => trip.id === savedTripId
              )
            : null;

          const nextTrip = savedTrip || allTrips[0];

          setActiveTripId(nextTrip.id);
          setTripTitle(
            nextTrip.title || "伊豆の旅"
          );

          // 現在選択中の旅を記憶
          localStorage.setItem(
            storageKey,
            nextTrip.id
          );
        } else {
          setActiveTripId(null);
          setTripTitle("伊豆の旅");

          localStorage.removeItem(
            `izuscape_active_trip_${userId}`
          );
        }
      } catch (error: any) {
        console.error(
          "[IZUscape] 旅の読み込み失敗:",
          error
        );

        alert(
          `旅の読み込みに失敗しました。\n\n${
            error?.code ?? "unknown"
          }\n${
            error?.message ?? "原因不明のエラー"
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const savedPosts = useMemo(
    () =>
      savedIds
        .map((id) =>
          posts.find((post) => post.id === id)
        )
        .filter(Boolean) as Post[],
    [savedIds, posts]
  );

  const activeTrip = trips.find(
    (trip) => trip.id === activeTripId
  );

  const tripPosts = useMemo(() => {
    const ids = activeTrip?.placeIds ?? [];

    return ids
      .map((id) =>
        posts.find((post) => post.id === id)
      )
      .filter(Boolean) as Post[];
  }, [activeTrip, posts]);

  const availablePosts = savedPosts.filter(
    (post) =>
      !(activeTrip?.placeIds ?? []).includes(post.id)
  );

  const selectedPost = posts.find(
    (post) => post.id === selectedPostId
  );

  // =========================================================
  // CREATE TRIP
  // =========================================================

  const createTrip = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    try {
      const ref = await addDoc(
        collection(db, "trips"),
        {
          userId,
          title: "伊豆の旅",
          placeIds: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      const nextTrip: Trip = {
        id: ref.id,
        title: "伊豆の旅",
        placeIds: [],
      };

      setTrips((prev) => [
        nextTrip,
        ...prev,
      ]);

      setActiveTripId(ref.id);
      setTripTitle("伊豆の旅");

      // 新しく作った旅を記憶
      localStorage.setItem(
        `izuscape_active_trip_${userId}`,
        ref.id
      );
    } catch (error: any) {
      console.error(
        "[IZUscape] 旅作成失敗:",
        error
      );

      alert(
        `旅を作成できませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    }
  };

  // =========================================================
  // CREATE TRIP AND ADD PLACE
  // =========================================================

  const createTripAndAddPlace = async () => {
    if (
      !userId ||
      !selectedPostId ||
      addingToTrip
    ) {
      return;
    }

    setAddingToTrip(true);

    try {
      const ref = await addDoc(
        collection(db, "trips"),
        {
          userId,
          title: "伊豆の旅",
          placeIds: [selectedPostId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      const nextTrip: Trip = {
        id: ref.id,
        title: "伊豆の旅",
        placeIds: [selectedPostId],
      };

      setTrips((prev) => [
        nextTrip,
        ...prev,
      ]);

      setActiveTripId(ref.id);
      setTripTitle("伊豆の旅");

      // 新しい旅を記憶
      localStorage.setItem(
        `izuscape_active_trip_${userId}`,
        ref.id
      );

      setTripModalOpen(false);
      setSelectedPostId(null);
    } catch (error: any) {
      console.error(
        "[IZUscape] 新しい旅の作成失敗:",
        error
      );

      alert(
        `新しい旅を作成できませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    } finally {
      setAddingToTrip(false);
    }
  };

  // =========================================================
  // OPEN ADD TO TRIP MODAL
  // =========================================================

  const openTripModal = (postId: string) => {
    setSelectedPostId(postId);
    setTripModalOpen(true);
  };

  // =========================================================
  // CLOSE ADD TO TRIP MODAL
  // =========================================================

  const closeTripModal = () => {
    if (addingToTrip) return;

    setTripModalOpen(false);
    setSelectedPostId(null);
  };

  // =========================================================
  // ADD PLACE TO SELECTED TRIP
  // =========================================================

  const addPlaceToTrip = async (tripId: string) => {
    if (
      !selectedPostId ||
      addingToTrip
    ) {
      return;
    }

    const targetTrip = trips.find(
      (trip) => trip.id === tripId
    );

    if (!targetTrip) return;

    const currentIds =
      targetTrip.placeIds ?? [];

    if (
      currentIds.includes(selectedPostId)
    ) {
      setTripModalOpen(false);
      setSelectedPostId(null);
      return;
    }

    const nextIds = [
      ...currentIds,
      selectedPostId,
    ];

    setAddingToTrip(true);

    try {
      await updateDoc(
        doc(db, "trips", tripId),
        {
          placeIds: nextIds,
          updatedAt: serverTimestamp(),
        }
      );

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === tripId
            ? {
                ...trip,
                placeIds: nextIds,
              }
            : trip
        )
      );

      setActiveTripId(tripId);
      setTripTitle(
        targetTrip.title || "伊豆の旅"
      );

      // 選択した旅を記憶
      if (userId) {
        localStorage.setItem(
          `izuscape_active_trip_${userId}`,
          tripId
        );
      }

      setTripModalOpen(false);
      setSelectedPostId(null);
    } catch (error: any) {
      console.error(
        "[IZUscape] 場所の旅への追加失敗:",
        error
      );

      alert(
        `場所を旅に追加できませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    } finally {
      setAddingToTrip(false);
    }
  };

  // =========================================================
  // SAVE TRIP
  // =========================================================

  const saveTrip = async () => {
    if (
      !activeTripId ||
      !userId
    ) {
      return;
    }

    setSaving(true);

    try {
      const nextTitle =
        tripTitle.trim() ||
        "伊豆の旅";

      await updateDoc(
        doc(db, "trips", activeTripId),
        {
          title: nextTitle,
          placeIds:
            activeTrip?.placeIds ?? [],
          updatedAt:
            serverTimestamp(),
        }
      );

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === activeTripId
            ? {
                ...trip,
                title: nextTitle,
              }
            : trip
        )
      );

      setTripTitle(nextTitle);

      // 現在の旅を記憶
      localStorage.setItem(
        `izuscape_active_trip_${userId}`,
        activeTripId
      );
    } catch (error: any) {
      console.error(
        "[IZUscape] 旅保存失敗:",
        error
      );

      alert(
        `旅を保存できませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE TRIP
  // =========================================================

  const deleteTrip = async () => {
    if (
      !activeTripId ||
      !userId ||
      deleting
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "この旅を削除しますか？\n旅に追加した場所も、この旅から外れます。"
      );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const deletingId =
        activeTripId;

      await deleteDoc(
        doc(db, "trips", deletingId)
      );

      const remainingTrips =
        trips.filter(
          (trip) =>
            trip.id !== deletingId
        );

      setTrips(remainingTrips);

      if (
        remainingTrips.length > 0
      ) {
        const nextTrip =
          remainingTrips[0];

        setActiveTripId(
          nextTrip.id
        );

        setTripTitle(
          nextTrip.title ||
            "伊豆の旅"
        );

        // 次の旅を記憶
        localStorage.setItem(
          `izuscape_active_trip_${userId}`,
          nextTrip.id
        );
      } else {
        setActiveTripId(null);
        setTripTitle("伊豆の旅");

        // 選択中の旅を削除
        localStorage.removeItem(
          `izuscape_active_trip_${userId}`
        );
      }
    } catch (error: any) {
      console.error(
        "[IZUscape] 旅削除失敗:",
        error
      );

      alert(
        `旅を削除できませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    } finally {
      setDeleting(false);
    }
  };

  // =========================================================
  // ADD PLACE TO ACTIVE TRIP
  // =========================================================

  const addPlace = async (
    postId: string
  ) => {
    if (!userId) {
      router.push("/login");
      return;
    }

    if (
      !activeTripId ||
      !activeTrip
    ) {
      alert(
        "追加先の旅が選択されていません"
      );
      return;
    }

    const currentIds =
      activeTrip.placeIds ?? [];

    if (
      currentIds.includes(postId)
    ) {
      return;
    }

    const nextIds = [
      ...currentIds,
      postId,
    ];

    try {
      console.log(
        "[IZUscape] 場所追加開始",
        {
          tripId: activeTripId,
          postId,
          nextIds,
        }
      );

      await updateDoc(
        doc(db, "trips", activeTripId),
        {
          placeIds: nextIds,
          updatedAt:
            serverTimestamp(),
        }
      );

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === activeTripId
            ? {
                ...trip,
                placeIds: nextIds,
              }
            : trip
        )
      );

      console.log(
        "[IZUscape] 場所追加・Firestore保存成功"
      );
    } catch (error: any) {
      console.error(
        "[IZUscape] 場所追加失敗:",
        error
      );

      alert(
        `旅への追加に失敗しました。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    }
  };

  // =========================================================
  // REMOVE PLACE
  // =========================================================

  const removePlace = async (
    postId: string
  ) => {
    if (
      !activeTripId ||
      !activeTrip
    ) {
      return;
    }

    const nextIds =
      (activeTrip.placeIds ?? [])
        .filter(
          (id) => id !== postId
        );

    try {
      await updateDoc(
        doc(db, "trips", activeTripId),
        {
          placeIds: nextIds,
          updatedAt:
            serverTimestamp(),
        }
      );

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === activeTripId
            ? {
                ...trip,
                placeIds: nextIds,
              }
            : trip
        )
      );
    } catch (error: any) {
      console.error(
        "[IZUscape] 場所削除失敗:",
        error
      );

      alert(
        `場所を外せませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    }
  };

  // =========================================================
  // MOVE PLACE
  // =========================================================

  const movePlace = async (
    index: number,
    direction: -1 | 1
  ) => {
    if (
      !activeTripId ||
      !activeTrip
    ) {
      return;
    }

    const nextIndex =
      index + direction;

    const ids = [
      ...(activeTrip.placeIds ?? []),
    ];

    if (
      nextIndex < 0 ||
      nextIndex >= ids.length
    ) {
      return;
    }

    [ids[index], ids[nextIndex]] = [
      ids[nextIndex],
      ids[index],
    ];

    try {
      await updateDoc(
        doc(db, "trips", activeTripId),
        {
          placeIds: ids,
          updatedAt:
            serverTimestamp(),
        }
      );

      setTrips((prev) =>
        prev.map((trip) =>
          trip.id === activeTripId
            ? {
                ...trip,
                placeIds: ids,
              }
            : trip
        )
      );
    } catch (error: any) {
      console.error(
        "[IZUscape] 順番変更失敗:",
        error
      );

      alert(
        `順番を変更できませんでした。\n\n${
          error?.code ?? "unknown"
        }\n${
          error?.message ?? "原因不明のエラー"
        }`
      );
    }
  };

  // =========================================================
  // LINE SHARE
  // =========================================================

  const shareToLine = () => {
    if (!activeTrip) return;

    const placeText =
      tripPosts
        .map(
          (post, index) =>
            `${index + 1}. ${
              post.title ||
              "旅の場所"
            }`
        )
        .join("\n");

    const text =
      `${tripTitle || "伊豆の旅"}\n` +
      `${placeText}\n\n` +
      `IZUscape`;

    const url =
      `https://line.me/R/msg/text/?` +
      `${encodeURIComponent(text)}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================================
  // NOT LOGGED IN
  // =========================================================

  if (!userId) {
    return (
      <main className="izu-trip-page">
        <section className="izu-trip-empty">

          <p className="izu-section-kicker">
            YOUR TRIP
          </p>

          <h1>
            見つけた場所から、
            <br />
            自分の旅をつくろう。
          </h1>

          <p>
            気になった場所を保存すると、
            <br />
            ここから自分だけの旅にまとめられます。
          </p>

          <Link
            href="/login"
            className="izu-primary-button"
          >
            ログインして始める
            <span>↗</span>
          </Link>

        </section>
      </main>
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <main className="izu-trip-page">
        <div className="izu-trip-loading">
          旅の候補を集めています…
        </div>
      </main>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <main className="izu-trip-page">

      {/* =========================
          HEADER
      ========================= */}

      <section className="izu-trip-header">

        <div>

          <p className="izu-section-kicker">
            YOUR TRIP
          </p>

          <h1>
            見つけた場所から、
            <br />
            自分の旅をつくろう。
          </h1>

          <p>
            決まったコースではなく、
            <br />
            気になった場所を自分の順番で。
          </p>

        </div>

        <button
          type="button"
          className="izu-trip-share"
          onClick={shareToLine}
          disabled={
            !activeTrip ||
            tripPosts.length === 0
          }
        >
          LINEで共有
          <span>↗</span>
        </button>

      </section>

      {/* =========================
          WORKSPACE
      ========================= */}

      <section className="izu-trip-workspace">

        {/* =========================
            SIDEBAR
        ========================= */}

        <aside className="izu-trip-sidebar">

          <div className="izu-trip-sidebar-head">

            <span>
              MY TRIPS
            </span>

            <button
              type="button"
              onClick={createTrip}
              aria-label="新しい旅を作る"
            >
              ＋
            </button>

          </div>

          {trips.map((trip) => (

            <div
              key={trip.id}
              className={
                trip.id === activeTripId
                  ? "izu-trip-list-wrap active"
                  : "izu-trip-list-wrap"
              }
            >

              <button
                type="button"
                className={
                  trip.id === activeTripId
                    ? "izu-trip-list-item active"
                    : "izu-trip-list-item"
                }
                onClick={() => {

                  setActiveTripId(
                    trip.id
                  );

                  setTripTitle(
                    trip.title ||
                      "伊豆の旅"
                  );

                  // 選択した旅を記憶
                  if (userId) {
                    localStorage.setItem(
                      `izuscape_active_trip_${userId}`,
                      trip.id
                    );
                  }
                }}
              >

                <strong>
                  {trip.title ||
                    "伊豆の旅"}
                </strong>

                <span>
                  {trip.placeIds?.length ??
                    0}
                  か所
                </span>

              </button>

            </div>

          ))}

          {trips.length === 0 && (

            <button
              type="button"
              className="izu-trip-create-card"
              onClick={createTrip}
            >

              <strong>
                最初の旅をつくる
              </strong>

              <span>
                ＋
              </span>

            </button>

          )}

        </aside>

        {/* =========================
            MAIN AREA
        ========================= */}

        <div className="izu-trip-main">

          {activeTrip ? (
            <>

              {/* =========================
                  TITLE
              ========================= */}

              <div className="izu-trip-title-row">

                <input
                  value={tripTitle}
                  onChange={(event) =>
                    setTripTitle(
                      event.target.value
                    )
                  }
                  aria-label="旅の名前"
                />

                <div className="izu-trip-title-actions">

                  <button
                    type="button"
                    onClick={saveTrip}
                    disabled={saving}
                  >
                    {saving
                      ? "保存中…"
                      : "保存"}
                  </button>

                  <button
                    type="button"
                    className="izu-trip-delete-button"
                    onClick={deleteTrip}
                    disabled={deleting}
                  >
                    {deleting
                      ? "削除中…"
                      : "旅を削除"}
                  </button>

                </div>

              </div>

              {/* =========================
                  TABS
              ========================= */}

              <div className="izu-trip-tabs">

                <span className="active">
                  時間順
                </span>

                <span>
                  地図順
                </span>

              </div>

              {/* =========================
                  ROUTE
              ========================= */}

              <div className="izu-trip-route">

                {tripPosts.length === 0 ? (

                  <div className="izu-trip-placeholder">

                    <span>
                      01
                    </span>

                    <div>

                      <h2>
                        まだ場所がありません。
                      </h2>

                      <p>
                        保存した候補から、
                        気になる場所を追加してみよう。
                      </p>

                    </div>

                  </div>

                ) : (

                  tripPosts.map(
                    (post, index) => (

                      <article
                        key={post.id}
                        className="izu-trip-stop"
                      >

                        <div className="izu-trip-stop-number">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <Link
                          href={`/experience/${post.id}`}
                          className="izu-trip-stop-image"
                        >

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

                        </Link>

                        <div className="izu-trip-stop-copy">

                          <span>
                            {getAreaName(
                              post
                            )}
                          </span>

                          <h2>
                            {post.title ||
                              "旅の場所"}
                          </h2>

                          <p>
                            {(post.tags ??
                              [])
                              .slice(
                                0,
                                3
                              )
                              .join(
                                " · "
                              )}
                          </p>

                        </div>

                        <div className="izu-trip-stop-actions">

                          <button
                            type="button"
                            onClick={() =>
                              movePlace(
                                index,
                                -1
                              )
                            }
                            disabled={
                              index ===
                              0
                            }
                            aria-label="前へ"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              movePlace(
                                index,
                                1
                              )
                            }
                            disabled={
                              index ===
                              tripPosts.length -
                                1
                            }
                            aria-label="次へ"
                          >
                            ↓
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removePlace(
                                post.id
                              )
                            }
                          >
                            外す
                          </button>

                        </div>

                      </article>

                    )
                  )

                )}

              </div>

              {/* =========================
                  ADD PLACES
              ========================= */}

              <section className="izu-trip-add">

                <div className="izu-trip-add-head">

                  <div>

                    <p className="izu-section-kicker">
                      FROM YOUR DISCOVERY
                    </p>

                    <h2>
                      気になっていた場所を追加
                    </h2>

                  </div>

                  <span>
                    {availablePosts.length}
                    件
                  </span>

                </div>

                {availablePosts.length === 0 ? (

                  <p className="izu-trip-add-empty">
                    まだ追加できる候補がありません。
                    ホームで場所を探してみよう。
                  </p>

                ) : (

                  <div className="izu-trip-add-grid">

                    {availablePosts
                      .slice(0, 6)
                      .map((post) => (

                        <button
                          key={post.id}
                          type="button"
                          className="izu-trip-add-card"
                          onClick={() =>
                            openTripModal(
                              post.id
                            )
                          }
                        >

                          <div className="izu-trip-add-image">

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

                          <div>

                            <span>
                              {getAreaName(
                                post
                              )}
                            </span>

                            <strong>
                              {post.title ||
                                "旅の場所"}
                            </strong>

                          </div>

                          <b>
                            ＋
                          </b>

                        </button>

                      ))}

                  </div>

                )}

              </section>

            </>

          ) : (

            <div className="izu-trip-placeholder">

              <h2>
                旅を選んでください。
              </h2>

              <p>
                左側から旅を選ぶか、
                新しい旅をつくってみよう。
              </p>

            </div>

          )}

        </div>

      </section>

      {/* =====================================================
          ADD TO TRIP MODAL
      ===================================================== */}

      {tripModalOpen &&
        selectedPost && (

          <div
            className="izu-trip-modal-overlay"
            onClick={
              closeTripModal
            }
          >

            <div
              className="izu-trip-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="izu-trip-modal-head">

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
                  className="izu-trip-modal-close"
                  onClick={
                    closeTripModal
                  }
                  disabled={
                    addingToTrip
                  }
                  aria-label="閉じる"
                >
                  ×
                </button>

              </div>

              <div className="izu-trip-modal-list">

                {trips.map((trip) => {

                  const alreadyAdded =
                    (
                      trip.placeIds ??
                      []
                    ).includes(
                      selectedPost.id
                    );

                  return (

                    <button
                      key={trip.id}
                      type="button"
                      className="izu-trip-modal-trip"
                      onClick={() =>
                        addPlaceToTrip(
                          trip.id
                        )
                      }
                      disabled={
                        addingToTrip ||
                        alreadyAdded
                      }
                    >

                      <div>

                        <strong>
                          {trip.title ||
                            "伊豆の旅"}
                        </strong>

                        <span>
                          {trip.placeIds?.length ??
                            0}
                          か所
                        </span>

                      </div>

                      <b>
                        {alreadyAdded
                          ? "✓"
                          : "+"}
                      </b>

                    </button>

                  );
                })}

                <button
                  type="button"
                  className="izu-trip-modal-new"
                  onClick={
                    createTripAndAddPlace
                  }
                  disabled={
                    addingToTrip
                  }
                >

                  <div>

                    <strong>
                      新しい旅をつくる
                    </strong>

                    <span>
                      この場所を最初の候補にする
                    </span>

                  </div>

                  <b>
                    ＋
                  </b>

                </button>

              </div>

            </div>

          </div>

        )}

    </main>
  );
}