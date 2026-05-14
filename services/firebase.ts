import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

let db: any = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.warn("Firebase Initialization Error. Falling back to LocalStorage.", e);
}

export { db };