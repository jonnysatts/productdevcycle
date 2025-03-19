// Re-export the firebase-lazy module
// This file exists for backward compatibility with existing imports

import {
  getDb,
  getFirebaseAuth,
  isFirebaseInitialized,
  isFirebaseConfigAvailable,
  initializeFirebase,
  resetFirebase,
  type FallbackFirestore,
  type FallbackAuth
} from './firebase-lazy';

// Re-export the db and auth instances that will start as fallbacks
// and only become real Firebase instances when initializeFirebase is called
const db = getDb();
const auth = getFirebaseAuth();
let analytics = null;

// Also export the interfaces and types for type checking
export type { FallbackFirestore, FallbackAuth };

// Export the instances and functions
export {
  db,
  auth,
  analytics,
  isFirebaseInitialized,
  isFirebaseConfigAvailable,
  initializeFirebase,
  resetFirebase
}; 