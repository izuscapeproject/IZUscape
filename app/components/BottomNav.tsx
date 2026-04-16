"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path ? "#000" : "#999";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        width: "100%",
        maxWidth: "500px",
        background: "#fff",
        borderTop: "1px solid #eee",
        display: "flex",
        justifyContent: "space-around",
        padding: "10px 0",
      }}
    >
      <Link href="/" style={{ color: isActive("/") }}>
        🏠
      </Link>

      <Link href="/saved" style={{ color: isActive("/saved") }}>
        🔖
      </Link>

      <Link href="/post" style={{ color: isActive("/post") }}>
        ➕
      </Link>
    </div>
  );
}