// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your_firebase_api_key_here",
  authDomain: "asha-15a3d.firebaseapp.com",
  projectId: "asha-15a3d",
  storageBucket: "asha-15a3d.firebasestorage.app",
  messagingSenderId: "755614599551",
  appId: "1:755614599551:web:2f328bb2529459747f724a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
