// Firebase本体

import {
  initializeApp,
  getApps,
  getApp,
} from "firebase/app";

import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    "AIzaSyANC2mfpHAjpdrIjw_WuT9tbvP_Jy8TN7c",

  authDomain:
    "izuscape.firebaseapp.com",

  projectId:
    "izuscape",

  storageBucket:
    "izuscape.firebasestorage.app",

  messagingSenderId:
    "607261441767",

  appId:
    "1:607261441767:web:af3580c86901d5bf74ac42",
};

// Firebase本体
const app =
  getApps().length
    ? getApp()
    : initializeApp(firebaseConfig);


// ================================
// Firebase App Check
// ================================

declare global {
  var __IZU_APP_CHECK_INITIALIZED__: boolean | undefined;
}

// App Checkはブラウザでのみ初期化
if (
  typeof window !== "undefined" &&
  !globalThis.__IZU_APP_CHECK_INITIALIZED__
) {
  const recaptchaSiteKey =
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider:
        new ReCaptchaEnterpriseProvider(
          recaptchaSiteKey
        ),

      // App Checkトークンを自動更新
      isTokenAutoRefreshEnabled: true,
    });

    globalThis.__IZU_APP_CHECK_INITIALIZED__ = true;
  } else {
    console.warn(
      "NEXT_PUBLIC_RECAPTCHA_SITE_KEY が設定されていません。"
    );
  }
}


// ================================
// Firebaseサービス
// ================================

export const auth =
  getAuth(app);

export const db =
  getFirestore(app);

export const storage =
  getStorage(app);