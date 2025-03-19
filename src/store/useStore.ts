import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Product, 
  RiskAssessment, 
  SeasonalAnalysis, 
  Scenario, 
  LikelihoodLevel, 
  ImpactLevel,
  ScenarioModel 
} from '../types';
import { DEFAULT_GROWTH_METRICS, DEFAULT_REVENUE_METRICS, DEFAULT_COST_METRICS, DEFAULT_CUSTOMER_METRICS, DEFAULT_SEASONAL_ANALYSIS } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  getDoc,
  setDoc,
  serverTimestamp,
  Firestore,
  CollectionReference,
  DocumentReference,
  DocumentData
} from 'firebase/firestore';
import type { StorageMode } from '../contexts/StorageContext';
import { useCallback, useState } from 'react';
import { getDb } from '../lib/firebase-lazy';
import { persist } from 'zustand/middleware';

// Collection names
const PRODUCTS_COLLECTION = 'products';
const SCENARIOS_COLLECTION = 'scenarios';

// Legacy localStorage keys (for data migration)
const STORAGE_KEY = 'fortress-products';
const SCENARIOS_STORAGE_KEY = 'fortress-scenarios';

// Global variable to track storage mode - can be updated from outside
let currentStorageMode: StorageMode = 'cloud';

// Function to set the current storage mode from the StorageContext
export const setStorageMode = (mode: StorageMode) => {
  currentStorageMode = mode;
  console.log(`Storage mode set to: ${mode}`);
};

// Check if we should use Firebase or localStorage
const useFirebase = (): boolean => {
  return currentStorageMode === 'cloud' && Boolean(
    typeof db === 'object' && (db as any).type
  );
};

// Helper to ensure we're using Firestore properly
const getFirestore = (): Firestore => {
  if (!useFirebase()) {
    console.warn('Using local storage instead of Firebase');
    return null as any;
  }
  
  if (!db || typeof db !== 'object' || !(db as any).type) {
    console.warn('Using fallback Firestore, some operations may not work properly');
    return db as any;
  }
  return db as Firestore;
};

// Get a collection reference
const getCollection = (path: string): CollectionReference => {
  return collection(getFirestore(), path);
};

// Get a document reference
const getDocument = (collectionPath: string, docId: string): DocumentReference => {
  return doc(getFirestore(), collectionPath, docId);
};

// Load products from storage (Firestore or localStorage)
const loadProducts = async (): Promise<Product[]> => {
  if (useFirebase()) {
    try {
      const productsSnapshot = await getDocs(getCollection(PRODUCTS_COLLECTION));
      const products: Product[] = [];
      
      productsSnapshot.forEach((doc) => {
        const data = doc.data() as Product;
        // Ensure the ID is set correctly
        if (!data.info) {
          const now = new Date();
          data.info = { 
            id: doc.id, 
            name: '', 
            type: 'Experiential Events',
            description: '', 
            logo: null,
            targetAudience: '',
            developmentStartDate: now,
            developmentEndDate: now,
            launchDate: now,
            forecastPeriod: 12,
            forecastType: 'weekly',
            createdAt: now,
            updatedAt: now
          };
        }
        if (!data.info.id) data.info.id = doc.id;
        
        // Ensure actuals array is initialized
        if (!data.actuals) {
          data.actuals = [];
        }
        
        products.push(data);
      });
      
      return products;
    } catch (error) {
      console.error('Error loading products from Firestore:', error);
      // Fall through to localStorage as backup
    }
  }
  
  // Use localStorage (either by preference or as fallback)
  try {
    const savedProducts = localStorage.getItem(STORAGE_KEY);
    const products = savedProducts ? JSON.parse(savedProducts) : [];
    
    // Ensure actuals is initialized on all products
    products.forEach((product: Product) => {
      if (!product.actuals) {
        product.actuals = [];
      }
    });
    
    return products;
  } catch (localError) {
    console.error('Error loading products from localStorage:', localError);
    return [];
  }
};

// Save product to storage (Firestore or localStorage)
const saveProduct = async (product: Product): Promise<void> => {
  // Always save to localStorage as a backup regardless of storage mode
  try {
    const savedProducts = localStorage.getItem(STORAGE_KEY);
    const products = savedProducts ? JSON.parse(savedProducts) : [];
    const newProducts = [...products.filter((p: Product) => p.info.id !== product.info.id), product];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProducts));
  } catch (localError) {
    console.error('Error saving product to localStorage:', localError);
  }
  
  // If using cloud storage, also save to Firestore
  if (useFirebase()) {
    try {
      const docRef = getDocument(PRODUCTS_COLLECTION, product.info.id);
      await setDoc(docRef, {
        ...product,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving product to Firestore:', error);
    }
  }
};

// Load scenarios from storage (Firestore or localStorage)
const loadScenarios = async (): Promise<ScenarioModel[]> => {
  if (useFirebase()) {
    try {
      const scenariosSnapshot = await getDocs(getCollection(SCENARIOS_COLLECTION));
      const scenarios: ScenarioModel[] = [];
      
      scenariosSnapshot.forEach((doc) => {
        const data = doc.data() as ScenarioModel;
        // Ensure the ID is set correctly
        if (!data.id) data.id = doc.id;
        
        scenarios.push(data);
      });
      
      return scenarios;
    } catch (error) {
      console.error('Error loading scenarios from Firestore:', error);
      // Fall through to localStorage as backup
    }
  }
  
  // Use localStorage (either by preference or as fallback)
  try {
    const savedScenarios = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    return savedScenarios ? JSON.parse(savedScenarios) : [];
  } catch (localError) {
    console.error('Error loading scenarios from localStorage:', localError);
    return [];
  }
};

// Save scenario to storage (Firestore or localStorage)
const saveScenario = async (scenario: ScenarioModel): Promise<void> => {
  // Always save to localStorage as a backup regardless of storage mode
  try {
    const savedScenarios = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    const scenarios = savedScenarios ? JSON.parse(savedScenarios) : [];
    const newScenarios = [...scenarios.filter((s: ScenarioModel) => s.id !== scenario.id), scenario];
    localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(newScenarios));
  } catch (localError) {
    console.error('Error saving scenario to localStorage:', localError);
  }
  
  // If using cloud storage, also save to Firestore
  if (useFirebase()) {
    try {
      const docRef = getDocument(SCENARIOS_COLLECTION, scenario.id);
      await setDoc(docRef, {
        ...scenario,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving scenario to Firestore:', error);
    }
  }
};

// Delete scenario from storage
const deleteScenarioFromDB = async (scenarioId: string): Promise<void> => {
  // Remove from localStorage first
  try {
    const savedScenarios = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    if (savedScenarios) {
      const scenarios = JSON.parse(savedScenarios);
      const filteredScenarios = scenarios.filter((s: ScenarioModel) => s.id !== scenarioId);
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(filteredScenarios));
    }
  } catch (error) {
    console.error('Error deleting scenario from localStorage:', error);
  }
  
  // If using cloud storage, also delete from Firestore
  if (useFirebase()) {
    try {
      await deleteDoc(getDocument(SCENARIOS_COLLECTION, scenarioId));
    } catch (error) {
      console.error('Error deleting scenario from Firestore:', error);
    }
  }
};

// Delete product from storage
const deleteProductFromDB = async (productId: string): Promise<void> => {
  // Remove from localStorage first
  try {
    const savedProducts = localStorage.getItem(STORAGE_KEY);
    if (savedProducts) {
      const products = JSON.parse(savedProducts);
      const filteredProducts = products.filter((p: Product) => p.info.id !== productId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredProducts));
    }
  } catch (error) {
    console.error('Error deleting product from localStorage:', error);
  }
  
  // If using cloud storage, also delete from Firestore
  if (useFirebase()) {
    try {
      await deleteDoc(getDocument(PRODUCTS_COLLECTION, productId));
    } catch (error) {
      console.error('Error deleting product from Firestore:', error);
    }
  }
};

interface StoreState {
  products: Product[];
  currentProductId: string | null;
  isLoading: boolean;
  error: string | null;
  scenarios: ScenarioModel[];
  recentlyViewed: string[];
  addScenarioModel: (scenario: ScenarioModel) => void;
  updateScenarioModel: (scenario: ScenarioModel) => void;
  deleteScenarioModel: (scenarioId: string) => void;
  getScenariosByProduct: (productId: string) => ScenarioModel[];
  addProduct: (product: Product) => void;
  updateProduct: ((productId: string, updates: Partial<Product>) => void) & ((product: Product) => void);
  deleteProduct: (productId: string) => void;
  setCurrentProduct: (productId: string | null) => void;
  clearError: () => void;
  addRiskAssessment: (productId: string, risk: Omit<RiskAssessment, 'id'>) => void;
  updateRiskAssessment: (productId: string, riskId: string, updates: Partial<RiskAssessment>) => void;
  deleteRiskAssessment: (productId: string, riskId: string) => void;
  updateSeasonalAnalysis: (productId: string, seasonalAnalysis: SeasonalAnalysis[]) => void;
  addScenario: (productId: string, scenario: Omit<Scenario, 'id'>) => void;
  updateScenario: (productId: string, scenarioId: string, updates: Partial<Scenario>) => void;
  deleteScenario: (productId: string, scenarioId: string) => void;
  initializeStore: () => Promise<void>;
  syncStorage: (mode: StorageMode) => Promise<void>;
}

const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        products: [],
        currentProductId: null,
        isLoading: false,
        error: null,
        scenarios: [],
        recentlyViewed: [],

        // Initialize store with data from storage
        initializeStore: async () => {
          set({ isLoading: true });
          try {
            // Load from storage based on current mode
            const products = await loadProducts();
            const scenarios = await loadScenarios();
            
            set({ 
              products, 
              scenarios,
              isLoading: false
            });
            
            // If we have a currentProductId in localStorage, use it
            const currentId = localStorage.getItem('currentProductId');
            if (currentId && products.some(p => p.info.id === currentId)) {
              set({ currentProductId: currentId });
            } else if (products.length > 0) {
              set({ currentProductId: products[0].info.id });
            }
          } catch (error) {
            console.error('Error initializing store:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to initialize store',
              isLoading: false 
            });
          }
        },

        // Sync storage when mode changes
        syncStorage: async (mode: StorageMode) => {
          setStorageMode(mode);
          return get().initializeStore();
        },

        addScenarioModel: (scenario: ScenarioModel) => {
          // Generate ID if not present
          const newScenario = {
            ...scenario,
            id: scenario.id || crypto.randomUUID(),
            updatedAt: new Date().toISOString()
          };
          
          set((state) => {
            const newScenarios = [...state.scenarios, newScenario];
            return { scenarios: newScenarios };
          });
          
          // Save to storage (Firestore or localStorage)
          saveScenario(newScenario);
        },

        updateScenarioModel: (scenario: ScenarioModel) => {
          set((state) => {
            const newScenarios = state.scenarios.map((s) => 
              s.id === scenario.id ? { ...scenario, updatedAt: new Date().toISOString() } : s
            );
            return { scenarios: newScenarios };
          });
          
          // Save to storage (Firestore or localStorage)
          saveScenario({
            ...scenario,
            updatedAt: new Date().toISOString()
          });
        },

        deleteScenarioModel: (scenarioId: string) => {
          set((state) => {
            const newScenarios = state.scenarios.filter((s) => s.id !== scenarioId);
            return { scenarios: newScenarios };
          });
          
          // Delete from storage
          deleteScenarioFromDB(scenarioId);
        },

        getScenariosByProduct: (productId: string) => {
          return get().scenarios.filter((s) => s.productId === productId);
        },

        clearError: () => set({ error: null }),

        addProduct: (product: Product) => {
          // Generate ID if not present
          const productId = product.info.id || crypto.randomUUID();
          const newProduct = {
            ...product,
            info: {
              ...product.info,
              id: productId
            },
            growthMetrics: { ...DEFAULT_GROWTH_METRICS },
            revenueMetrics: { ...DEFAULT_REVENUE_METRICS },
            costMetrics: { ...DEFAULT_COST_METRICS },
            customerMetrics: { ...DEFAULT_CUSTOMER_METRICS },
            weeklyProjections: [],
            actualMetrics: [],
            actuals: [],  // Initialize as empty array instead of undefined
            risks: [],
            seasonalAnalysis: [...DEFAULT_SEASONAL_ANALYSIS],
            scenarios: []
          };
          
          set((state) => {
            const newProducts = [...state.products, newProduct];
            return {
              products: newProducts,
              currentProductId: productId
            };
          });
          
          // Save current product ID to localStorage for persistence between sessions
          localStorage.setItem('currentProductId', productId);
          
          // Save to storage (Firestore or localStorage)
          saveProduct(newProduct);
        },

        updateProduct: ((productIdOrProduct: string | Product, updates?: Partial<Product>) => {
          // Check if first argument is a product object or a product ID
          if (typeof productIdOrProduct === 'object') {
            // First argument is a product object
            const product = productIdOrProduct;
            
            set((state) => {
              const newProducts = state.products.map((p: Product) => 
                p.id === product.id 
                  ? { ...product }
                  : p
              );
              return { products: newProducts };
            });
            
            // Save to storage
            try {
              saveProduct(product);
            } catch (error) {
              console.error('Error saving product:', error);
            }
          } else {
            // First argument is a product ID
            const productId = productIdOrProduct;
            
            set((state) => {
              const newProducts = state.products.map((p: Product) => 
                p.info.id === productId 
                  ? { ...p, ...updates }
                  : p
              );
              return { products: newProducts };
            });
            
            // Save to storage
            try {
              const product = get().products.find(p => p.info.id === productId);
              if (product) {
                saveProduct({ ...product, ...updates! });
              }
            } catch (error) {
              console.error('Error saving product:', error);
            }
          }
        }) as any,

        addRiskAssessment: (productId: string, risk: Omit<RiskAssessment, 'id'>) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId) {
                const newRisk = {
                  ...risk,
                  id: crypto.randomUUID(),
                  riskScore: calculateRiskScore(risk.likelihood, risk.impact)
                };
                return {
                  ...p,
                  risks: [...p.risks, newRisk]
                };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        updateRiskAssessment: (productId: string, riskId: string, updates: Partial<RiskAssessment>) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId) {
                const newRisks = p.risks.map((r: RiskAssessment) => {
                  if (r.id === riskId) {
                    const updatedRisk = { ...r, ...updates };
                    if (updates.likelihood || updates.impact) {
                      updatedRisk.riskScore = calculateRiskScore(
                        updatedRisk.likelihood, 
                        updatedRisk.impact
                      );
                    }
                    return updatedRisk;
                  }
                  return r;
                });
                return { ...p, risks: newRisks };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        deleteRiskAssessment: (productId: string, riskId: string) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId) {
                return {
                  ...p,
                  risks: p.risks.filter((r: RiskAssessment) => r.id !== riskId)
                };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        updateSeasonalAnalysis: (productId: string, seasonalAnalysis: SeasonalAnalysis[]) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId) {
                return { ...p, seasonalAnalysis };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        addScenario: (productId: string, scenario: Omit<Scenario, 'id'>) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId) {
                const newScenario = {
                  ...scenario,
                  id: crypto.randomUUID(),
                  projectedProfit: (scenario.projectedRevenue || 0) - (scenario.projectedCosts || 0),
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                return {
                  ...p,
                  scenarios: p.scenarios ? [...p.scenarios, newScenario] : [newScenario]
                };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        updateScenario: (productId: string, scenarioId: string, updates: Partial<Scenario>) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId && p.scenarios) {
                const newScenarios = p.scenarios.map((s: Scenario) => {
                  if (s.id === scenarioId) {
                    // Calculate projected profit if revenue or costs are updated
                    const projectedProfit = 
                      (updates.projectedRevenue !== undefined || updates.projectedCosts !== undefined) 
                        ? ((updates.projectedRevenue ?? (s.projectedRevenue || 0)) - 
                          (updates.projectedCosts ?? (s.projectedCosts || 0)))
                        : s.projectedProfit;
                    
                    return { 
                      ...s, 
                      ...updates, 
                      projectedProfit,
                      updatedAt: new Date() 
                    };
                  }
                  return s;
                });
                return { ...p, scenarios: newScenarios };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        deleteScenario: (productId: string, scenarioId: string) => {
          set((state) => {
            const newProducts = state.products.map((p: Product) => {
              if (p.info.id === productId && p.scenarios) {
                return {
                  ...p,
                  scenarios: p.scenarios.filter((s: Scenario) => s.id !== scenarioId)
                };
              }
              return p;
            });
            return { products: newProducts };
          });
          
          // Save the updated product
          const product = get().products.find(p => p.info.id === productId);
          if (product) {
            saveProduct(product);
          }
        },

        deleteProduct: (productId: string) => {
          set((state) => {
            const newProducts = state.products.filter((p: Product) => p.info.id !== productId);
            return {
              products: newProducts,
              currentProductId: state.currentProductId === productId ? null : state.currentProductId
            };
          });
          
          // Delete from storage
          deleteProductFromDB(productId);
        },

        setCurrentProduct: (productId: string | null) => {
          set((state) => {
            // Don't track if it's the same product or null
            if (state.currentProductId === productId || productId === null) {
              return { currentProductId: productId };
            }
            
            // Remove the product if it's already in recently viewed to avoid duplicates
            const filteredRecent = state.recentlyViewed.filter(id => id !== productId);
            
            // Add the new product ID to the beginning of the array and keep only the 5 most recent
            return {
              currentProductId: productId,
              recentlyViewed: [productId, ...filteredRecent].slice(0, 5)
            };
          });
          
          // Save to localStorage for persistence
          if (productId) {
            localStorage.setItem('currentProductId', productId);
          } else {
            localStorage.removeItem('currentProductId');
          }
        }
      }),
      {
        name: 'fortress-financial-store',
        partialize: (state) => {
          // Update to include recentlyViewed in persistence
          const { isLoading, error, ...rest } = state;
          return rest;
        },
      }
    )
  )
);

// Helper function to calculate risk score based on likelihood and impact
const calculateRiskScore = (
  likelihood: LikelihoodLevel, 
  impact: ImpactLevel
): number => {
  const likelihoodScore = likelihood === 'Low' ? 1 : likelihood === 'Medium' ? 2 : 3;
  const impactScore = impact === 'Low' ? 1 : impact === 'Medium' ? 2 : 3;
  
  return likelihoodScore * impactScore;
};

// Initialize the store when it's first imported
const store = useStore.getState();
store.initializeStore();

export default useStore;