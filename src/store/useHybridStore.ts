import { useState, useCallback, useEffect } from 'react';
import { type StorageMode } from '../contexts/StorageContext';
import { useLocalStore } from './useLocalStore';
import { getDb, initializeFirebase, isFirebaseInitialized } from '../lib/firebase-lazy';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  Firestore,
} from 'firebase/firestore';
import type { Scenario, Product, WeeklyActuals } from './useLocalStore';

// Collection names for Firebase
const SCENARIOS_COLLECTION = 'scenarios';
const PRODUCTS_COLLECTION = 'products';

/**
 * A hybrid store hook that can use either Firebase or local storage
 * based on the user's preference.
 * 
 * This provides a unified interface regardless of the storage backend.
 */
const useHybridStore = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [storageMode, setStorageModeState] = useState<StorageMode>('local');
  const localStore = useLocalStore();

  // Storage mode can be set from outside (via StorageContext)
  const setStorageMode = (mode: StorageMode) => {
    console.log(`Setting hybrid store mode to: ${mode}`);
    setStorageModeState(mode);
  };

  // Initialize or re-initialize the store
  const initializeStore = async () => {
    console.log(`Initializing hybrid store with mode: ${storageMode}`);
    
    if (storageMode === 'cloud' && !isFirebaseInitialized()) {
      const success = await initializeFirebase();
      if (!success) {
        console.error('Failed to initialize Firebase, falling back to local storage');
        setStorageModeState('local');
        return false;
      }
    }
    
    return true;
  };

  // Initialize on mount
  useEffect(() => {
    initializeStore();
  }, []);

  // Helper to map Firebase document to our model
  const mapDocToScenario = (doc: any): Scenario => {
    const data = doc.data ? doc.data() : doc;
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      products: data.products || [],
    };
  };

  // Helper function to handle Firestore operations with proper type casting
  const withFirestore = <T,>(operation: (db: Firestore) => Promise<T>): Promise<T> => {
    try {
      // Use type assertion for Firestore
      const firestoreDb = getDb() as unknown as Firestore;
      return operation(firestoreDb);
    } catch (error) {
      console.error('Error performing Firestore operation:', error);
      throw error;
    }
  };

  // Get all scenarios
  const getScenarios = useCallback(async (): Promise<Scenario[]> => {
    if (storageMode === 'local') {
      return localStore.getScenarios();
    }
    
    setIsLoading(true);
    try {
      return await withFirestore(async (db) => {
        const scenariosSnapshot = await getDocs(collection(db, SCENARIOS_COLLECTION));
        return scenariosSnapshot.docs.map(mapDocToScenario);
      });
    } catch (error) {
      console.error('Error getting scenarios from Firebase:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore]);

  // Get a scenario by ID
  const getScenario = useCallback(async (id: string): Promise<Scenario | null> => {
    if (storageMode === 'local') {
      return localStore.getScenario(id);
    }
    
    setIsLoading(true);
    try {
      return await withFirestore(async (db) => {
        const scenarioDoc = await getDoc(doc(db, SCENARIOS_COLLECTION, id));
        return scenarioDoc.exists() ? mapDocToScenario(scenarioDoc) : null;
      });
    } catch (error) {
      console.error(`Error getting scenario ${id} from Firebase:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore]);

  // Create a new scenario
  const createScenario = useCallback(async (scenario: Omit<Scenario, 'id'>): Promise<Scenario | null> => {
    if (storageMode === 'local') {
      return localStore.createScenario(scenario);
    }
    
    setIsLoading(true);
    try {
      return await withFirestore(async (db) => {
        const docRef = await addDoc(collection(db, SCENARIOS_COLLECTION), {
          ...scenario,
          products: scenario.products || [],
        });
        
        return {
          id: docRef.id,
          ...scenario,
        };
      });
    } catch (error) {
      console.error('Error creating scenario in Firebase:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore]);

  // Update a scenario
  const updateScenario = useCallback(async (scenario: Scenario): Promise<boolean> => {
    if (storageMode === 'local') {
      return localStore.updateScenario(scenario);
    }
    
    setIsLoading(true);
    try {
      await withFirestore(async (db) => {
        await updateDoc(doc(db, SCENARIOS_COLLECTION, scenario.id), {
          name: scenario.name,
          description: scenario.description,
          products: scenario.products || [],
        });
      });
      
      return true;
    } catch (error) {
      console.error(`Error updating scenario ${scenario.id} in Firebase:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore]);

  // Delete a scenario
  const deleteScenario = useCallback(async (id: string): Promise<boolean> => {
    if (storageMode === 'local') {
      return localStore.deleteScenario(id);
    }
    
    setIsLoading(true);
    try {
      await withFirestore(async (db) => {
        await deleteDoc(doc(db, SCENARIOS_COLLECTION, id));
      });
      
      return true;
    } catch (error) {
      console.error(`Error deleting scenario ${id} from Firebase:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore]);

  // Get all products for a scenario
  const getProducts = useCallback(async (scenarioId: string): Promise<Product[]> => {
    if (storageMode === 'local') {
      return localStore.getProducts(scenarioId);
    }
    
    // In Firebase implementation, products are part of scenario
    const scenario = await getScenario(scenarioId);
    return scenario?.products || [];
  }, [storageMode, localStore, getScenario]);

  // Get a product by ID
  const getProduct = useCallback(async (scenarioId: string, productId: string): Promise<Product | null> => {
    if (storageMode === 'local') {
      return localStore.getProduct(scenarioId, productId);
    }
    
    const products = await getProducts(scenarioId);
    return products.find((p: Product) => p.id === productId) || null;
  }, [storageMode, localStore, getProducts]);

  // Create a new product
  const createProduct = useCallback(async (
    scenarioId: string,
    product: Omit<Product, 'id'>
  ): Promise<Product | null> => {
    if (storageMode === 'local') {
      return localStore.createProduct(scenarioId, product);
    }
    
    setIsLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      
      if (!scenario) {
        return null;
      }
      
      const newProduct = {
        id: 'product-' + Date.now(),
        ...product,
      };
      
      const updatedProducts = [...(scenario.products || []), newProduct];
      const updatedScenario = {
        ...scenario,
        products: updatedProducts,
      };
      
      const success = await updateScenario(updatedScenario);
      
      return success ? newProduct : null;
    } catch (error) {
      console.error(`Error creating product for scenario ${scenarioId} in Firebase:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore, getScenario, updateScenario]);

  // Function overloads for updateProduct
  async function updateProduct(scenarioId: string, productId: string, update: Partial<Product>): Promise<boolean>;
  async function updateProduct(scenarioId: string, product: Product): Promise<boolean>;
  
  // Implementation of updateProduct
  async function updateProduct(
    scenarioId: string,
    productOrId: string | Product,
    update?: Partial<Product>
  ): Promise<boolean> {
    if (storageMode === 'local') {
      return localStore.updateProduct(scenarioId, productOrId as any, update);
    }
    
    setIsLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      
      if (!scenario) {
        return false;
      }
      
      let updatedProducts: Product[];
      
      if (typeof productOrId === 'string' && update) {
        // First overload: Update by ID
        const productId = productOrId;
        updatedProducts = scenario.products.map((p: Product) => 
          p.id === productId ? { ...p, ...update } : p
        );
      } else if (typeof productOrId === 'object') {
        // Second overload: Update by product object
        const product = productOrId;
        updatedProducts = scenario.products.map((p: Product) => 
          p.id === product.id ? product : p
        );
      } else {
        return false;
      }
      
      const updatedScenario = {
        ...scenario,
        products: updatedProducts,
      };
      
      return await updateScenario(updatedScenario);
    } catch (error) {
      console.error(`Error updating product in scenario ${scenarioId} in Firebase:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  // Delete a product
  const deleteProduct = useCallback(async (scenarioId: string, productId: string): Promise<boolean> => {
    if (storageMode === 'local') {
      return localStore.deleteProduct(scenarioId, productId);
    }
    
    setIsLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      
      if (!scenario) {
        return false;
      }
      
      const updatedProducts = scenario.products.filter((p: Product) => p.id !== productId);
      
      if (updatedProducts.length === scenario.products.length) {
        return false;
      }
      
      const updatedScenario = {
        ...scenario,
        products: updatedProducts,
      };
      
      return await updateScenario(updatedScenario);
    } catch (error) {
      console.error(`Error deleting product ${productId} from scenario ${scenarioId} in Firebase:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storageMode, localStore, getScenario, updateScenario]);

  return {
    isLoading,
    storageMode,
    setStorageMode,
    initializeStore,
    getScenarios,
    getScenario,
    createScenario,
    updateScenario,
    deleteScenario,
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
  };
};

export default useHybridStore; 