import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleUser } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/calendar.events');

const TOKEN_KEY = 'iris_g_access_token';
const USER_KEY = 'iris_g_user';

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;

export const getSavedUser = (): GoogleUser | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading saved user', e);
  }
  return null;
};

export const initAuth = (
  onAuthSuccess?: (user: GoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  // If we already have a saved user & token in localStorage, immediately trigger success!
  const savedUser = getSavedUser();
  const savedToken = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (savedUser && savedToken) {
    cachedAccessToken = savedToken;
    if (onAuthSuccess) {
      onAuthSuccess(savedUser, savedToken);
    }
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const activeToken = cachedAccessToken || localStorage.getItem(TOKEN_KEY);
      if (activeToken) {
        cachedAccessToken = activeToken;
        const gUser: GoogleUser = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(gUser));
        if (onAuthSuccess) {
          onAuthSuccess(gUser, activeToken);
        }
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // Not logged in to Firebase
      if (!savedToken) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: GoogleUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token dari Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    const user = result.user;
    const gUser: GoogleUser = {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    };

    // Save to localStorage for persistent session
    localStorage.setItem(TOKEN_KEY, credential.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(gUser));

    return {
      user: gUser,
      accessToken: cachedAccessToken,
    };
  } catch (error: any) {
    // Gracefully handle when user closes the popup or cancels
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  }
  return null;
};

export const logout = async () => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    cachedAccessToken = null;
    await signOut(auth);
  } catch (e) {
    console.warn('Logout error', e);
  }
};
