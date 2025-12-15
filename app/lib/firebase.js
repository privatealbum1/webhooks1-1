import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Thay các thông số này bằng của bạn (Lấy từ Firebase Console)
// Tốt nhất là dùng biến môi trường, nhưng mình điền tạm vào đây để test cho dễ
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "DÁN_API_KEY_CỦA_BẠN_VÀO_ĐÂY",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "DÁN_PROJECT_ID.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "DÁN_PROJECT_ID",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "DÁN_PROJECT_ID.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "...",
  appId: process.env.FIREBASE_APP_ID || "..."
};

// Singleton pattern để tránh khởi tạo lại nhiều lần
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
