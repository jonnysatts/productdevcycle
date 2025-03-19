import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { initializeFirebase, isFirebaseConfigAvailable, isFirebaseInitialized, resetFirebase } from '../lib/firebase-lazy';
import { useNotifications } from './NotificationContext';

// Storage mode key for localStorage
const STORAGE_MODE_KEY = 'storageMode';

// Define the storage modes
export type StorageMode = 'cloud' | 'local';

// Define the context shape
interface StorageContextType {
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => Promise<boolean>;
  isCloudAvailable: boolean;
  isInitializing: boolean;
  error: string | null;
}

// Create the context with a default value
const StorageContext = createContext<StorageContextType>({
  storageMode: 'local',
  setStorageMode: async () => false,
  isCloudAvailable: false,
  isInitializing: false,
  error: null
});

// Hook to use the storage context
export const useStorage = () => useContext(StorageContext);

// Provider component
interface StorageProviderProps {
  children: ReactNode;
}

export const StorageProvider: React.FC<StorageProviderProps> = ({ children }) => {
  const [storageMode, setStorageModeState] = useState<StorageMode>('local');
  const [isCloudAvailable, setIsCloudAvailable] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  // Initialize storage settings
  useEffect(() => {
    const initializeStorage = async () => {
      setIsInitializing(true);
      setError(null);
      
      try {
        // Check if Firebase is available
        const configAvailable = isFirebaseConfigAvailable();
        setIsCloudAvailable(configAvailable);
        
        // Get user preference from localStorage (default to 'local')
        const savedMode = localStorage.getItem(STORAGE_MODE_KEY) as StorageMode || 'local';
        
        // If user prefers cloud and it's available, initialize Firebase
        if (savedMode === 'cloud' && configAvailable) {
          const initSuccess = await initializeFirebase();
          if (initSuccess) {
            setStorageModeState('cloud');
            localStorage.setItem(STORAGE_MODE_KEY, 'cloud');
          } else {
            // Fall back to local if initialization fails
            setStorageModeState('local');
            localStorage.setItem(STORAGE_MODE_KEY, 'local');
            setError('Failed to initialize cloud storage. Using local storage instead.');
            addNotification({
              type: 'error',
              message: 'Failed to initialize cloud storage. Using local storage instead.'
            });
          }
        } else {
          // Use local storage
          setStorageModeState('local');
          localStorage.setItem(STORAGE_MODE_KEY, 'local');
        }
      } catch (err) {
        console.error('Error initializing storage:', err);
        setError('Failed to initialize storage. Using local storage.');
        addNotification({
          type: 'error',
          message: 'Failed to initialize storage. Using local storage.'
        });
        setStorageModeState('local');
        localStorage.setItem(STORAGE_MODE_KEY, 'local');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeStorage();
  }, [addNotification]);
  
  // Function to set storage mode
  const setStorageMode = async (mode: StorageMode): Promise<boolean> => {
    try {
      if (mode === 'cloud') {
        // Check if cloud is available
        if (!isCloudAvailable) {
          setError('Cloud storage is not available. Configure Firebase first.');
          addNotification({
            type: 'error',
            message: 'Cloud storage is not available. Configure Firebase first.'
          });
          return false;
        }
        
        // Initialize Firebase if not already initialized
        if (!isFirebaseInitialized()) {
          const initSuccess = await initializeFirebase();
          if (!initSuccess) {
            setError('Failed to initialize cloud storage.');
            addNotification({
              type: 'error',
              message: 'Failed to initialize cloud storage.'
            });
            return false;
          }
        }
      } else {
        // If switching to local, no need to initialize anything
        // Optionally reset Firebase to free resources
        if (isFirebaseInitialized()) {
          resetFirebase();
        }
      }
      
      // Update the storage mode
      setStorageModeState(mode);
      localStorage.setItem(STORAGE_MODE_KEY, mode);
      setError(null);
      addNotification({
        type: 'success',
        message: `Storage mode changed to ${mode}`
      });
      return true;
    } catch (err) {
      console.error('Error changing storage mode:', err);
      const errorMessage = `Failed to change storage mode: ${err}`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage
      });
      return false;
    }
  };
  
  const value = {
    storageMode,
    setStorageMode,
    isCloudAvailable,
    isInitializing,
    error
  };
  
  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
}; 