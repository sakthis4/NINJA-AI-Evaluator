import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Robust helper to check env vars in various environments
const getEnvVar = (key: string) => {
  // Try import.meta.env (Vite standard)
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  // Fallback to process.env if available (Node/Polyfill)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  return undefined;
};

const apiKey = getEnvVar('VITE_FIREBASE_API_KEY');
const projectId = getEnvVar('VITE_FIREBASE_PROJECT_ID');

let app;
let db: any = null;

// Only attempt to initialize if critical keys are present
if (apiKey && projectId) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId,
      storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('VITE_FIREBASE_APP_ID')
    };

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log("Firebase initialized successfully");
  } catch (e) {
    console.warn("Firebase Initialization Error. Falling back to LocalStorage.", e);
    // db remains null
  }
} else {
  console.warn("Firebase credentials missing in .env.local. App running in Offline Mode (LocalStorage).");
  // db remains null
}

export { db };