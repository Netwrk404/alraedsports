import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

const app = typeof window !== "undefined" && firebaseEnabled
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const auth = app ? getAuth(app) : null;
export const googleProvider = app ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.setCustomParameters({
    prompt: "select_account",
  });
}

export const signInWithGoogle = async () => {
  if (!firebaseEnabled || !auth || !googleProvider) {
    throw new Error("Firebase is not configured. Add your NEXT_PUBLIC Firebase values to the environment.");
  }

  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      return redirectResult;
    }
  } catch {
    // Ignore redirect result errors and continue with popup flow.
  }

  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    const isPopupBlocked = message.includes("popup") || message.includes("blocked") || message.includes("Cross-Origin-Opener-Policy") || message.includes("auth/popup-blocked") || code === "auth/popup-blocked";
    const isUnauthorizedDomain = code === "auth/unauthorized-domain" || message.includes("unauthorized-domain");
    const isInvalidApiKey = code === "auth/invalid-api-key" || message.includes("invalid-api-key");
    const isCancelledByUser = code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request";

    if (isUnauthorizedDomain) {
      throw new Error("This domain is not authorized in Firebase. In Firebase Console > Authentication > Settings > Authorized domains, add localhost, 127.0.0.1, and your live Vercel domain.");
    }

    if (isInvalidApiKey) {
      throw new Error("Firebase API key is invalid. Check the NEXT_PUBLIC_FIREBASE_API_KEY value in your environment.");
    }

    if (isPopupBlocked || isCancelledByUser) {
      await signInWithRedirect(auth, googleProvider);
      throw new Error("Google sign-in is redirecting. Complete the sign-in in the next page.");
    }

    throw error;
  }
};

export const logoutFirebase = () => (auth ? signOut(auth) : Promise.resolve());

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!firebaseEnabled || !auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, callback);
};
