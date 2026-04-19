import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export async function generateMetadata({ params }: any) {
  const q = query(
    collection(db, "posts"),
    where("slug", "==", params.id)
  );

  const snap = await getDocs(q);
  const post = snap.docs[0]?.data();

  if (!post) {
    return {
      title: "IZUscape",
    };
  }

  return {
    title: `${post.title} | IZUscape`,
    description: post.contents?.[0]?.slice(0, 80) || "",
  };
}

export default function Layout({ children }: any) {
  return <>{children}</>;
}