import { useEffect } from 'react';
import { useStorage } from '../contexts/StorageContext';
import useHybridStore from './useHybridStore';

/**
 * Hook to synchronize storage context with the hybrid store
 * Ensures that both systems use the same storage mode
 */
export const useStorageSync = () => {
  const { storageMode } = useStorage();
  const store = useHybridStore();

  // Sync store's storage mode with the context's storage mode
  useEffect(() => {
    const syncStoreMode = async () => {
      try {
        // Only update if the storage modes are different
        if (store.storageMode !== storageMode) {
          console.log(`Syncing store storage mode to: ${storageMode}`);
          
          // Set the store's mode to match the context's mode
          store.setStorageMode(storageMode);
          
          // Re-initialize the store with the new mode
          await store.initializeStore();
        }
      } catch (err) {
        console.error('Error syncing storage modes:', err);
      }
    };

    syncStoreMode();
  }, [storageMode, store]);

  // This hook doesn't render anything
  return null;
};

export default useStorageSync; 