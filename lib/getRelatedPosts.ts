import { collection, query, where, limit, getDocs } from "firebase/firestore"
import { db } from "./firebase"

export async function getRelatedPosts(area: string) {
  const q = query(
    collection(db, "posts"),
    where("area", "==", area),
    limit(5)
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}