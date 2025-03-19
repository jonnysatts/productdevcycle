// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, DocumentReference, CollectionReference, DocumentData } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getAuth as firebaseGetAuth, User, Auth } from "firebase/auth";

// Define interfaces for the fallback objects
export interface FallbackFirestore {
  collection: (path: string) => {
    add: (data: any) => Promise<{ id: string }>;
    doc: (id: string) => {
      set: (data: any) => Promise<void>;
      update: (data: any) => Promise<void>;
      delete: () => Promise<void>;
    };
    get: () => Promise<{ docs: Array<any> }>;
  };
  doc: (path: string) => {
    set: (data: any) => Promise<void>;
    update: (data: any) => Promise<void>;
    delete: () => Promise<void>;
    get: () => Promise<{ exists: boolean; data: () => any }>;
  };
}

export interface FallbackAuth {
  onAuthStateChanged: (callback: (user: User | null) => void) => () => void;
  signInAnonymously: () => Promise<{ user: { uid: string } }>;
  signOut: () => Promise<void>;
}

// Create placeholder db for fallback mode
export const createFallbackFirestore = (): FallbackFirestore => ({
  collection: () => ({
    add: () => Promise.resolve({ id: 'local-' + Date.now() }),
    doc: () => ({
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve()
    }),
    get: () => Promise.resolve({ docs: [] })
  }),
  doc: () => ({
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    get: () => Promise.resolve({ exists: false, data: () => ({}) })
  })
});

// Create placeholder auth for fallback mode
export const createFallbackAuth = (): FallbackAuth => ({
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    callback(null);
    return () => {};
  },
  signInAnonymously: () => Promise.resolve({ user: { uid: 'anonymous-' + Date.now() } }),
  signOut: () => Promise.resolve()
});

// Variables to store Firebase instances
let app: FirebaseApp | null = null;
let db: Firestore | FallbackFirestore = createFallbackFirestore();
let analytics: Analytics | null = null;
let auth: Auth | FallbackAuth = createFallbackAuth();
let isInitialized: boolean = false;

// Get Firebase configuration from environment variables
const getFirebaseConfig = () => {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };
};

// Check if Firebase configuration is available
export const isFirebaseConfigAvailable = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
};

// Initialize Firebase only when explicitly requested
export const initializeFirebase = async (): Promise<boolean> => {
  if (isInitialized) {
    return true; // Already initialized
  }
  
  // Check if Firebase config is available
  if (!isFirebaseConfigAvailable()) {
    console.warn('Firebase configuration not available. Using local storage mode.');
    return false;
  }
  
  try {
    const firebaseConfig = getFirebaseConfig();
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = firebaseGetAuth(app);
    
    // Only initialize analytics in browser environment
    if (typeof window !== 'undefined') {
      analytics = getAnalytics(app);
    }
    
    isInitialized = true;
    console.log('Firebase initialized successfully');
    return true;
  } catch (e) {
    console.error('Error initializing Firebase:', e);
    
    // Reset to fallback implementations
    db = createFallbackFirestore();
    auth = createFallbackAuth();
    return false;
  }
};

// Reset Firebase to uninitialized state (for testing or local mode switch)
export const resetFirebase = () => {
  app = null;
  db = createFallbackFirestore();
  analytics = null;
  auth = createFallbackAuth();
  isInitialized = false;
};

// Get the current db instance (Firestore or fallback)
export const getDb = (): Firestore | FallbackFirestore => db;

// Get the current auth instance (Auth or fallback)
export const getFirebaseAuth = (): Auth | FallbackAuth => auth;

// Check if Firebase is currently initialized
export const isFirebaseInitialized = (): boolean => isInitialized; 