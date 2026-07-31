import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously as firebaseSignInAnonymously, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LearningItem, FossilizedError, TargetLanguage } from '../types';

// Initialize Firebase App safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      console.log('Google Sign-In popup closed by user.');
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const ensureAnonymousUser = async () => {
  if (!auth.currentUser) {
    try {
      const result = await firebaseSignInAnonymously(auth);
      return result.user;
    } catch (error) {
      console.warn('Anonymous login failed or disabled:', error);
    }
  }
  return auth.currentUser;
};

export const signOutUser = async () => {
  try {
    await firebaseSignOut(auth);
    // Re-initialize anonymous user after signout for uninterrupted local sync
    await firebaseSignInAnonymously(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
  }
};

// Cloud Sync Helpers
export const syncLearningItemsToCloud = async (userId: string, items: LearningItem[]) => {
  if (!userId || !items.length) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const itemRef = doc(db, 'users', userId, 'learningItems', item.id);
      batch.set(itemRef, {
        ...item,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      console.warn('Firestore write quota reached. Switched to offline local storage fallback.');
    } else {
      console.error('Firestore save items error:', err);
    }
  }
};

export const syncFossilizedErrorsToCloud = async (userId: string, errors: FossilizedError[]) => {
  if (!userId || !errors.length) return;
  try {
    const batch = writeBatch(db);
    errors.forEach((errItem) => {
      const errRef = doc(db, 'users', userId, 'fossilizedErrors', errItem.id);
      batch.set(errRef, {
        ...errItem,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
    await batch.commit();
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      console.warn('Firestore write quota reached. Switched to offline local storage fallback.');
    } else {
      console.error('Firestore save errors error:', err);
    }
  }
};

export const syncUserProfileToCloud = async (
  userId: string, 
  data: { currentLanguage?: TargetLanguage; dailyGoalProgress?: number; streak?: number }
) => {
  if (!userId) return;
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota exceeded')) {
      console.warn('Firestore profile write quota reached.');
    } else {
      console.error('Firestore save profile error:', err);
    }
  }
};
