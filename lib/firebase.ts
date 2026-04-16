// Firebase本体
import { initializeApp, getApps, getApp } from "firebase/app";

// 🔥 追加（これが重要）
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔥 あなたの設定（そのままでOK）
const firebaseConfig = {
  apiKey: "AIzaSyANC2mfpHAjpdrIjw_WuT9tbvP_Jy8TN7c",
  authDomain: "izuscape.firebaseapp.com",
  projectId: "izuscape",
  storageBucket: "izuscape.firebasestorage.app",
  messagingSenderId: "607261441767",
  appId: "1:607261441767:web:af3580c86901d5bf74ac42"
};

// 🔥 ここが重要（Next.js対策）
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🔥 使う機能を外に出す
export const auth = getAuth(app);       // ログイン
export const db = getFirestore(app);    // データベース
export const storage = getStorage(app); // 画像