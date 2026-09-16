import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBHbS1TuhUYntb3jHckXcTlQuj7zEvS-kA",
  authDomain: "hotel-management-system-48b99.firebaseapp.com",
  projectId: "hotel-management-system-48b99",
  storageBucket: "hotel-management-system-48b99.firebasestorage.app",
  messagingSenderId: "977254068994",
  appId: "1:977254068994:web:0f6737d695d512486f881b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;