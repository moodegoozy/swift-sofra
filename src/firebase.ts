// src/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, indexedDBLocalPersistence, browserLocalPersistence, initializeAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getMessaging, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: "AIzaSyC1iM3g3gGfu23GKLpDRQplBuHidPniFIk",
  authDomain: "albayt-sofra.firebaseapp.com",
  projectId: "albayt-sofra",
  storageBucket: "albayt-sofra.firebasestorage.app",
  messagingSenderId: "895117143740",
  appId: "1:895117143740:web:239cfccc93d101c1f36ab9",
  measurementId: "G-FK3746ERH8",
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// ✅ تهيئة Auth مع persistence محلي (IndexedDB أولاً ثم localStorage)
// هذا يضمن حفظ الجلسة حتى بعد إغلاق التطبيق على الجوال
export const auth = getApps().length > 0 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence]
    })

export const db = getFirestore(app)
export const storage = getStorage(app)

// 🔔 Firebase Cloud Messaging للإشعارات
export const getMessagingInstance = async () => {
  const supported = await isSupported()
  if (supported) {
    return getMessaging(app)
  }
  return null
}
