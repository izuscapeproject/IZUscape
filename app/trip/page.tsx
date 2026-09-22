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

  // 投稿詳細などから「旅に追加」で来た場合の投稿ID
  const [pendingAddPostId, setPendingAddPostId] = useState<string | null>(null);

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
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const addPostId = params.get("add");

    if (addPostId) {
      setPendingAddPostId(addPostId);
    }
  }, []);

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
  // OPEN MODAL FROM ?add=POST_ID
  // =========================================================

  useEffect(() => {
    if (
      !pendingAddPostId ||
      loading ||
      posts.length === 0
    ) {
      return;
    }

    const targetPost = posts.find(
      (post) => post.id === pendingAddPostId
    );

    if (!targetPost) {
      setPendingAddPostId(null);
      return;
    }

    setSelectedPostId(targetPost.id);
    setTripModalOpen(true);
    setPendingAddPostId(null);

    // URLをきれいに戻す
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("add");
      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    }
  }, [pendingAddPostId, loading, posts]);

  // =========================================================
  // DERIVED DATA
  // =========================================================

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

  // 保存していなくても、すべての投稿から旅に追加できる。
  // 「保存」は後で見返すため、「旅に追加」は旅程に組み込むための別機能。
  const availablePosts = posts.filter(
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
            気になった場所を旅に追加して、
            <br />
            ここから自分だけの旅をつくれます。
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

        <div className="izu-trip-header-copy">
          <p className="izu-section-kicker">
            YOUR TRIP
          </p>

          <h1>
            見つけた場所から、
            <br className="desktop-break" />
            自分の旅をつくろう。
          </h1>

          <p>
            気になった場所を選んで、
            <br className="desktop-break" />
            自分の順番で旅を組み立てよう。
          </p>
        </div>

        <button
          type="button"
          className="izu-trip-share"
          onClick={shareToLine}
          disabled={!activeTrip || tripPosts.length === 0}
        >
          LINEで共有
          <span>↗</span>
        </button>

      </section>

      {/* =========================
          TRIP SELECTOR
      ========================= */}

      <section className="izu-trip-selector">

        <div className="izu-trip-selector-head">
          <div>
            <p className="izu-section-kicker">MY TRIPS</p>
            <h2>旅を選ぶ</h2>
          </div>

          <button
            type="button"
            className="izu-trip-new-button"
            onClick={createTrip}
          >
            <span>＋</span>
            新しい旅
          </button>
        </div>

        {trips.length > 0 ? (
          <div className="izu-trip-selector-list">
            {trips.map((trip) => {
              const isActive = trip.id === activeTripId;

              return (
                <button
                  key={trip.id}
                  type="button"
                  className={
                    isActive
                      ? "izu-trip-selector-item active"
                      : "izu-trip-selector-item"
                  }
                  onClick={() => {
                    setActiveTripId(trip.id);
                    setTripTitle(trip.title || "伊豆の旅");

                    if (userId) {
                      localStorage.setItem(
                        `izuscape_active_trip_${userId}`,
                        trip.id
                      );
                    }
                  }}
                >
                  <span className="izu-trip-selector-check">
                    {isActive ? "✓" : ""}
                  </span>

                  <span className="izu-trip-selector-info">
                    <strong>
                      {trip.title || "伊豆の旅"}
                    </strong>
                    <small>
                      {trip.placeIds?.length ?? 0}か所
                    </small>
                  </span>

                  <span className="izu-trip-selector-arrow">
                    →
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="izu-trip-no-trips">
            <p>まだ旅がありません。</p>
            <button
              type="button"
              onClick={createTrip}
            >
              最初の旅をつくる
            </button>
          </div>
        )}

      </section>

      {/* =========================
          ACTIVE TRIP
      ========================= */}

      {activeTrip ? (
        <section className="izu-trip-editor">

          <div className="izu-trip-editor-head">

            <div className="izu-trip-title-area">
              <span className="izu-trip-label">
                CURRENT TRIP
              </span>

              <input
                value={tripTitle}
                onChange={(event) =>
                  setTripTitle(event.target.value)
                }
                aria-label="旅の名前"
                placeholder="旅の名前"
              />

              <p>
                {tripPosts.length}か所 ·
                好きな順番に並べられます
              </p>
            </div>

            <div className="izu-trip-title-actions">
              <button
                type="button"
                className="izu-trip-save-button"
                onClick={saveTrip}
                disabled={saving}
              >
                {saving ? "保存中…" : "保存"}
              </button>

              <button
                type="button"
                className="izu-trip-delete-button"
                onClick={deleteTrip}
                disabled={deleting}
              >
                {deleting ? "削除中…" : "旅を削除"}
              </button>
            </div>

          </div>

          <div className="izu-trip-route-head">
            <div>
              <span className="izu-trip-label">
                ROUTE
              </span>
              <h2>旅の順番</h2>
            </div>

            <span className="izu-trip-route-count">
              {tripPosts.length}か所
            </span>
          </div>

          <div className="izu-trip-route">

            {tripPosts.length === 0 ? (
              <div className="izu-trip-empty-route">
                <div className="izu-trip-empty-number">
                  01
                </div>

                <div>
                  <h3>まだ場所がありません。</h3>
                  <p>
                    下の「場所を追加」から、
                    気になる場所を旅に入れてみよう。
                  </p>
                </div>
              </div>
            ) : (
              tripPosts.map((post, index) => (
                <article
                  key={post.id}
                  className="izu-trip-stop"
                >

                  <div className="izu-trip-stop-number">
                    {String(index + 1).padStart(2, "0")}
                  </div>

                  <Link
                    href={`/experience/${post.id}`}
                    className="izu-trip-stop-image"
                  >
                    {post.images?.[0] ? (
                      <img
                        src={post.images[0]}
                        alt=""
                      />
                    ) : (
                      <span>IZU</span>
                    )}
                  </Link>

                  <div className="izu-trip-stop-copy">
                    <span>
                      {getAreaName(post)}
                    </span>

                    <Link
                      href={`/experience/${post.id}`}
                      className="izu-trip-stop-title"
                    >
                      {post.title || "旅の場所"}
                    </Link>

                    {post.description && (
                      <p className="izu-trip-stop-description">
                        {post.description}
                      </p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <p className="izu-trip-stop-tags">
                        {post.tags
                          .slice(0, 3)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="izu-trip-stop-actions">
                    <button
                      type="button"
                      onClick={() => movePlace(index, -1)}
                      disabled={index === 0}
                      aria-label="前へ"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => movePlace(index, 1)}
                      disabled={index === tripPosts.length - 1}
                      aria-label="次へ"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      className="remove"
                      onClick={() => removePlace(post.id)}
                    >
                      外す
                    </button>
                  </div>

                </article>
              ))
            )}

          </div>

          {/* =========================
              ADD PLACES
          ========================= */}

          <section className="izu-trip-add">

            <div className="izu-trip-add-head">
              <div>
                <p className="izu-section-kicker">
                  FROM DISCOVERY
                </p>
                <h2>この旅に場所を追加</h2>
                <p>
                  保存していない場所も、そのまま旅に追加できます。
                </p>
              </div>

              <span>
                {availablePosts.length}件
              </span>
            </div>

            {availablePosts.length === 0 ? (
              <p className="izu-trip-add-empty">
                追加できる場所がありません。
              </p>
            ) : (
              <div className="izu-trip-add-grid">
                {availablePosts.slice(0, 8).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    className="izu-trip-add-card"
                    onClick={() => openTripModal(post.id)}
                  >

                    <div className="izu-trip-add-image">
                      {post.images?.[0] ? (
                        <img
                          src={post.images[0]}
                          alt=""
                        />
                      ) : (
                        <span>IZU</span>
                      )}
                    </div>

                    <div className="izu-trip-add-card-copy">
                      <span>
                        {getAreaName(post)}
                      </span>

                      <strong>
                        {post.title || "旅の場所"}
                      </strong>
                    </div>

                    <b>＋</b>

                  </button>
                ))}
              </div>
            )}

          </section>

        </section>
      ) : (
        <section className="izu-trip-no-active">
          <div>
            <span className="izu-section-kicker">
              YOUR TRIP
            </span>
            <h2>旅を選んでください。</h2>
            <p>
              上から旅を選ぶか、
              新しい旅をつくってみよう。
            </p>
          </div>

          <button
            type="button"
            onClick={createTrip}
          >
            ＋ 新しい旅をつくる
          </button>
        </section>
      )}

      {/* =====================================================
          ADD TO TRIP MODAL
      ===================================================== */}

      {tripModalOpen && selectedPost && (
        <div
          className="izu-trip-modal-overlay"
          onClick={closeTripModal}
        >
          <div
            className="izu-trip-modal"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="izu-trip-modal-head">
              <div>
                <p className="izu-section-kicker">
                  ADD TO TRIP
                </p>
                <h2>この場所をどの旅に追加？</h2>
                <p>
                  「保存」しなくても、そのまま旅に追加できます。
                </p>
              </div>

              <button
                type="button"
                className="izu-trip-modal-close"
                onClick={closeTripModal}
                disabled={addingToTrip}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="izu-trip-selected-place">
              <div className="izu-trip-selected-place-image">
                {selectedPost.images?.[0] ? (
                  <img
                    src={selectedPost.images[0]}
                    alt=""
                  />
                ) : (
                  <span>IZU</span>
                )}
              </div>

              <div>
                <span>
                  {getAreaName(selectedPost)}
                </span>
                <strong>
                  {selectedPost.title || "旅の場所"}
                </strong>
              </div>
            </div>

            <div className="izu-trip-modal-list">

              {trips.map((trip) => {
                const alreadyAdded = (
                  trip.placeIds ?? []
                ).includes(selectedPost.id);

                return (
                  <button
                    key={trip.id}
                    type="button"
                    className={
                      alreadyAdded
                        ? "izu-trip-modal-trip added"
                        : "izu-trip-modal-trip"
                    }
                    onClick={() =>
                      addPlaceToTrip(trip.id)
                    }
                    disabled={
                      addingToTrip ||
                      alreadyAdded
                    }
                  >
                    <div>
                      <strong>
                        {trip.title || "伊豆の旅"}
                      </strong>

                      <span>
                        {trip.placeIds?.length ?? 0}か所
                      </span>
                    </div>

                    <b>
                      {alreadyAdded ? "✓ 追加済み" : "追加 →"}
                    </b>
                  </button>
                );
              })}

              <button
                type="button"
                className="izu-trip-modal-new"
                onClick={createTripAndAddPlace}
                disabled={addingToTrip}
              >
                <div>
                  <strong>
                    新しい旅をつくる
                  </strong>
                  <span>
                    この場所を最初の候補にする
                  </span>
                </div>

                <b>＋</b>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          PAGE CSS
      ===================================================== */}

      <style jsx global>{`
        .izu-trip-page {
          min-height: 100vh;
          max-width: 1180px;
          margin: 0 auto;
          padding: 48px 28px 100px;
          box-sizing: border-box;
          color: #26352e;
        }

        .izu-trip-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 34px;
        }

        .izu-trip-header-copy h1 {
          margin: 7px 0 12px;
          font-size: clamp(30px, 4vw, 48px);
          line-height: 1.15;
          letter-spacing: -0.04em;
          color: #1f3d2b;
        }

        .izu-trip-header-copy > p:last-child {
          margin: 0;
          color: #75817c;
          font-size: 14px;
          line-height: 1.8;
        }

        .izu-section-kicker {
          margin: 0;
          color: #7d8d84;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .izu-trip-share {
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid #dfe8e2;
          border-radius: 999px;
          background: #fff;
          color: #31513e;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .izu-trip-share span {
          margin-left: 7px;
        }

        .izu-trip-share:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .izu-trip-selector {
          margin-bottom: 28px;
          padding: 20px;
          border: 1px solid #e6ece8;
          border-radius: 22px;
          background: #f8faf8;
        }

        .izu-trip-selector-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .izu-trip-selector-head h2 {
          margin: 5px 0 0;
          font-size: 20px;
          color: #1f3d2b;
        }

        .izu-trip-new-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 14px;
          border: 1px solid #d5e1da;
          border-radius: 999px;
          background: #fff;
          color: #31513e;
          font-weight: 700;
          cursor: pointer;
        }

        .izu-trip-new-button span {
          font-size: 17px;
        }

        .izu-trip-selector-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 8px;
        }

        .izu-trip-selector-item {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          padding: 13px 14px;
          border: 1px solid #e1e8e3;
          border-radius: 14px;
          background: #fff;
          color: #53625b;
          text-align: left;
          cursor: pointer;
        }

        .izu-trip-selector-item.active {
          border-color: #a9c1b1;
          background: #edf4ef;
          box-shadow: 0 4px 16px rgba(31, 61, 43, 0.06);
        }

        .izu-trip-selector-check {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          flex: 0 0 24px;
          border-radius: 50%;
          background: #e8eee9;
          color: #2f6444;
          font-size: 12px;
          font-weight: 800;
        }

        .izu-trip-selector-item.active .izu-trip-selector-check {
          background: #cfe1d4;
        }

        .izu-trip-selector-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
          gap: 3px;
        }

        .izu-trip-selector-info strong {
          overflow: hidden;
          color: #26352e;
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .izu-trip-selector-info small {
          color: #89938f;
          font-size: 11px;
        }

        .izu-trip-selector-arrow {
          color: #9aa6a0;
          font-size: 17px;
        }

        .izu-trip-no-trips {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px;
          border-radius: 14px;
          background: #fff;
        }

        .izu-trip-no-trips p {
          margin: 0;
          color: #6d7973;
          font-size: 12px;
        }

        .izu-trip-no-trips button,
        .izu-trip-no-active button {
          min-height: 38px;
          padding: 0 15px;
          border: 0;
          border-radius: 999px;
          background: #315a40;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }

        .izu-trip-editor {
          overflow: hidden;
          border: 1px solid #e5ebe7;
          border-radius: 24px;
          background: #fff;
          box-shadow: 0 12px 40px rgba(31, 61, 43, 0.05);
        }

        .izu-trip-editor-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding: 25px 26px 22px;
          border-bottom: 1px solid #edf1ee;
        }

        .izu-trip-title-area {
          min-width: 0;
          flex: 1;
        }

        .izu-trip-label {
          display: block;
          margin-bottom: 8px;
          color: #829087;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .izu-trip-title-area input {
          width: 100%;
          max-width: 560px;
          padding: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1f3d2b;
          font-size: clamp(23px, 3vw, 32px);
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .izu-trip-title-area input::placeholder {
          color: #b0bab4;
        }

        .izu-trip-title-area p {
          margin: 7px 0 0;
          color: #8a9690;
          font-size: 11px;
        }

        .izu-trip-title-actions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }

        .izu-trip-title-actions button {
          min-height: 38px;
          padding: 0 13px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .izu-trip-save-button {
          border: 0;
          background: #315a40;
          color: #fff;
        }

        .izu-trip-delete-button {
          border: 1px solid #e5e9e6;
          background: #fff;
          color: #8a625d;
        }

        .izu-trip-title-actions button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .izu-trip-route-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          padding: 23px 26px 12px;
        }

        .izu-trip-route-head h2 {
          margin: 5px 0 0;
          color: #26352e;
          font-size: 18px;
        }

        .izu-trip-route-count {
          color: #89938f;
          font-size: 11px;
        }

        .izu-trip-route {
          padding: 0 26px 12px;
        }

        .izu-trip-stop {
          position: relative;
          display: grid;
          grid-template-columns: 34px 92px minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid #edf1ee;
        }

        .izu-trip-stop-number {
          color: #829087;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
        }

        .izu-trip-stop-image {
          display: block;
          overflow: hidden;
          width: 92px;
          height: 68px;
          border-radius: 12px;
          background: #e9efeb;
          text-decoration: none;
        }

        .izu-trip-stop-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .izu-trip-stop-image span {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: #718179;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .izu-trip-stop-copy {
          min-width: 0;
        }

        .izu-trip-stop-copy > span {
          display: block;
          margin-bottom: 4px;
          color: #7c8a82;
          font-size: 10px;
        }

        .izu-trip-stop-title {
          display: block;
          overflow: hidden;
          color: #26352e;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .izu-trip-stop-description,
        .izu-trip-stop-tags {
          margin: 4px 0 0;
          overflow: hidden;
          color: #8b9690;
          font-size: 10px;
          line-height: 1.5;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .izu-trip-stop-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .izu-trip-stop-actions button {
          min-width: 31px;
          height: 31px;
          padding: 0 7px;
          border: 1px solid #e3e9e5;
          border-radius: 8px;
          background: #fff;
          color: #617069;
          font-size: 11px;
          cursor: pointer;
        }

        .izu-trip-stop-actions button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .izu-trip-stop-actions .remove {
          color: #92716d;
        }

        .izu-trip-empty-route {
          display: flex;
          align-items: center;
          gap: 18px;
          margin: 0 0 8px;
          padding: 28px 18px;
          border: 1px dashed #dce5df;
          border-radius: 16px;
          background: #fafcfa;
        }

        .izu-trip-empty-number {
          color: #a4afa9;
          font-size: 13px;
          font-weight: 800;
        }

        .izu-trip-empty-route h3 {
          margin: 0;
          color: #53625b;
          font-size: 14px;
        }

        .izu-trip-empty-route p {
          margin: 5px 0 0;
          color: #89938f;
          font-size: 11px;
          line-height: 1.6;
        }

        .izu-trip-add {
          margin: 18px 26px 26px;
          padding: 22px;
          border-radius: 18px;
          background: #f6f9f6;
        }

        .izu-trip-add-head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 14px;
        }

        .izu-trip-add-head h2 {
          margin: 5px 0 4px;
          color: #26352e;
          font-size: 17px;
        }

        .izu-trip-add-head p:not(.izu-section-kicker) {
          margin: 0;
          color: #89938f;
          font-size: 10px;
        }

        .izu-trip-add-head > span {
          color: #87938d;
          font-size: 11px;
          white-space: nowrap;
        }

        .izu-trip-add-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
        }

        .izu-trip-add-card {
          position: relative;
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          border: 1px solid #e4ebe6;
          border-radius: 13px;
          background: #fff;
          color: #26352e;
          text-align: left;
          cursor: pointer;
        }

        .izu-trip-add-image {
          width: 100%;
          aspect-ratio: 1.55 / 1;
          overflow: hidden;
          background: #e9efeb;
        }

        .izu-trip-add-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .izu-trip-add-image span {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: #718179;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
        }

        .izu-trip-add-card-copy {
          min-width: 0;
          padding: 10px 34px 11px 11px;
        }

        .izu-trip-add-card-copy span {
          display: block;
          margin-bottom: 3px;
          color: #839088;
          font-size: 9px;
        }

        .izu-trip-add-card-copy strong {
          display: block;
          overflow: hidden;
          color: #34443b;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .izu-trip-add-card > b {
          position: absolute;
          right: 9px;
          bottom: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #315a40;
          color: #fff;
          font-size: 15px;
          line-height: 1;
        }

        .izu-trip-add-empty {
          margin: 0;
          color: #89938f;
          font-size: 11px;
        }

        .izu-trip-no-active {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 40px;
          border: 1px solid #e5ebe7;
          border-radius: 24px;
          background: #fff;
        }

        .izu-trip-no-active h2 {
          margin: 6px 0 7px;
          color: #1f3d2b;
          font-size: 22px;
        }

        .izu-trip-no-active p {
          margin: 0;
          color: #89938f;
          font-size: 12px;
        }

        /* =========================
           MODAL
        ========================= */

        .izu-trip-modal-overlay {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(25, 40, 32, 0.38);
          backdrop-filter: blur(4px);
        }

        .izu-trip-modal {
          width: min(520px, 100%);
          max-height: min(760px, calc(100vh - 40px));
          overflow: auto;
          padding: 22px;
          border: 1px solid #e1e8e3;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(20, 40, 28, 0.2);
        }

        .izu-trip-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .izu-trip-modal-head h2 {
          margin: 5px 0 5px;
          color: #1f3d2b;
          font-size: 20px;
        }

        .izu-trip-modal-head > div > p:last-child {
          margin: 0;
          color: #89938f;
          font-size: 10px;
          line-height: 1.5;
        }

        .izu-trip-modal-close {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border: 1px solid #e4e9e5;
          border-radius: 50%;
          background: #fff;
          color: #66736d;
          font-size: 20px;
          cursor: pointer;
        }

        .izu-trip-modal-close:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .izu-trip-selected-place {
          display: flex;
          align-items: center;
          gap: 11px;
          margin: 18px 0 12px;
          padding: 10px;
          border-radius: 13px;
          background: #f6f9f6;
        }

        .izu-trip-selected-place-image {
          width: 54px;
          height: 44px;
          flex: 0 0 54px;
          overflow: hidden;
          border-radius: 9px;
          background: #e5ece7;
        }

        .izu-trip-selected-place-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .izu-trip-selected-place-image span {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: #718179;
          font-size: 8px;
          font-weight: 800;
        }

        .izu-trip-selected-place > div:last-child {
          min-width: 0;
        }

        .izu-trip-selected-place span {
          display: block;
          color: #819087;
          font-size: 9px;
        }

        .izu-trip-selected-place strong {
          display: block;
          overflow: hidden;
          margin-top: 2px;
          color: #334239;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .izu-trip-modal-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .izu-trip-modal-trip,
        .izu-trip-modal-new {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          padding: 14px;
          border: 1px solid #e3e9e5;
          border-radius: 13px;
          background: #fff;
          text-align: left;
          cursor: pointer;
        }

        .izu-trip-modal-trip:hover:not(:disabled),
        .izu-trip-modal-new:hover:not(:disabled) {
          border-color: #b7ccbd;
          background: #f8fbf8;
        }

        .izu-trip-modal-trip > div,
        .izu-trip-modal-new > div {
          min-width: 0;
        }

        .izu-trip-modal-trip strong,
        .izu-trip-modal-new strong {
          display: block;
          overflow: hidden;
          color: #34443b;
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .izu-trip-modal-trip span,
        .izu-trip-modal-new span {
          display: block;
          margin-top: 3px;
          color: #8b9690;
          font-size: 10px;
        }

        .izu-trip-modal-trip b {
          flex-shrink: 0;
          color: #315a40;
          font-size: 11px;
        }

        .izu-trip-modal-trip.added {
          background: #f3f7f4;
          cursor: default;
        }

        .izu-trip-modal-new {
          border-style: dashed;
          border-color: #bdcfc2;
          background: #f7faf7;
        }

        .izu-trip-modal-new b {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #315a40;
          color: #fff;
          font-size: 17px;
        }

        .izu-trip-modal-list button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .izu-trip-loading,
        .izu-trip-empty {
          padding: 100px 20px;
          color: #89938f;
          text-align: center;
        }

        /* =========================
           MOBILE
        ========================= */

        @media (max-width: 760px) {
          .izu-trip-page {
            padding: 28px 14px 70px;
          }

          .izu-trip-header {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 22px;
          }

          .izu-trip-header-copy h1 {
            font-size: 30px;
          }

          .desktop-break {
            display: none;
          }

          .izu-trip-share {
            width: 100%;
          }

          .izu-trip-selector {
            padding: 15px;
            border-radius: 18px;
          }

          .izu-trip-selector-head {
            align-items: flex-end;
          }

          .izu-trip-selector-head h2 {
            font-size: 18px;
          }

          .izu-trip-new-button {
            min-height: 36px;
            padding: 0 11px;
          }

          .izu-trip-selector-list {
            display: flex;
            overflow-x: auto;
            padding-bottom: 3px;
            scroll-snap-type: x mandatory;
          }

          .izu-trip-selector-item {
            width: 220px;
            flex: 0 0 220px;
            scroll-snap-align: start;
          }

          .izu-trip-editor {
            border-radius: 18px;
          }

          .izu-trip-editor-head {
            flex-direction: column;
            gap: 16px;
            padding: 20px 17px 18px;
          }

          .izu-trip-title-area input {
            font-size: 24px;
          }

          .izu-trip-title-actions {
            width: 100%;
          }

          .izu-trip-title-actions button {
            flex: 1;
          }

          .izu-trip-route-head {
            padding: 20px 17px 10px;
          }

          .izu-trip-route {
            padding: 0 17px 8px;
          }

          .izu-trip-stop {
            grid-template-columns: 30px 76px minmax(0, 1fr);
            gap: 9px;
            align-items: start;
            padding: 13px 0;
          }

          .izu-trip-stop-number {
            padding-top: 9px;
          }

          .izu-trip-stop-image {
            width: 76px;
            height: 62px;
          }

          .izu-trip-stop-copy {
            padding-top: 5px;
          }

          .izu-trip-stop-title {
            font-size: 13px;
          }

          .izu-trip-stop-actions {
            grid-column: 2 / 4;
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 6px;
            margin-top: 1px;
          }

          .izu-trip-stop-actions button {
            height: 34px;
          }

          .izu-trip-add {
            margin: 14px 14px 17px;
            padding: 16px;
            border-radius: 15px;
          }

          .izu-trip-add-head {
            align-items: flex-start;
          }

          .izu-trip-add-head h2 {
            font-size: 16px;
          }

          .izu-trip-add-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .izu-trip-add-card-copy {
            padding: 8px 31px 9px 9px;
          }

          .izu-trip-add-card-copy strong {
            font-size: 10px;
          }

          .izu-trip-no-active {
            align-items: flex-start;
            flex-direction: column;
            padding: 28px 20px;
          }

          .izu-trip-no-trips {
            align-items: stretch;
            flex-direction: column;
          }

          .izu-trip-no-trips button {
            width: 100%;
          }

          .izu-trip-modal-overlay {
            align-items: flex-end;
            padding: 0;
          }

          .izu-trip-modal {
            width: 100%;
            max-height: 88vh;
            padding: 18px;
            border-radius: 22px 22px 0 0;
          }

          .izu-trip-modal-head h2 {
            font-size: 18px;
          }

          .izu-trip-modal-trip,
          .izu-trip-modal-new {
            min-height: 62px;
            padding: 13px;
          }
        }
      `}</style>
    </main>
  );
}
