import { useState, useCallback } from 'react';
import type { StorageMode } from '../contexts/StorageContext';

// Type definitions
export interface Product {
  id: string;
  name: string;
  financials: {
    expenses: number;
    income: number;
  };
  actuals?: WeeklyActuals[];
}

export interface WeeklyActuals {
  week: string;
  expenses: number;
  income: number;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  products: Product[];
}

// localStorage keys
const SCENARIOS_KEY = 'scenarios';
const PRODUCTS_KEY = 'products';

/**
 * A custom hook for store operations that use local storage
 * This is an alternative to Firebase for offline use
 */
export const useLocalStore = () => {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize store
  const initializeStore = async () => {
    console.log('Initializing local storage store');
    // Nothing special needed for localStorage initialization
    return true;
  };

  // Get all scenarios
  const getScenarios = useCallback(async (): Promise<Scenario[]> => {
    setIsLoading(true);
    try {
      const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]');
      return scenarios;
    } catch (error) {
      console.error('Error getting scenarios from localStorage:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get a scenario by ID
  const getScenario = useCallback(async (id: string): Promise<Scenario | null> => {
    setIsLoading(true);
    try {
      const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]');
      const scenario = scenarios.find((s: Scenario) => s.id === id);
      return scenario || null;
    } catch (error) {
      console.error(`Error getting scenario ${id} from localStorage:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new scenario
  const createScenario = useCallback(async (scenario: Omit<Scenario, 'id'>): Promise<Scenario | null> => {
    setIsLoading(true);
    try {
      const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]');
      const newScenario = {
        id: 'local-' + Date.now(),
        ...scenario,
        products: scenario.products || [],
      };
      
      scenarios.push(newScenario);
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
      
      return newScenario;
    } catch (error) {
      console.error('Error creating scenario in localStorage:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update a scenario
  const updateScenario = useCallback(async (scenario: Scenario): Promise<boolean> => {
    setIsLoading(true);
    try {
      const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]');
      const index = scenarios.findIndex((s: Scenario) => s.id === scenario.id);
      
      if (index === -1) {
        return false;
      }
      
      scenarios[index] = scenario;
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
      
      return true;
    } catch (error) {
      console.error(`Error updating scenario ${scenario.id} in localStorage:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete a scenario
  const deleteScenario = useCallback(async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || '[]');
      const filteredScenarios = scenarios.filter((s: Scenario) => s.id !== id);
      
      if (filteredScenarios.length === scenarios.length) {
        return false;
      }
      
      localStorage.setItem(SCENARIOS_KEY, JSON.stringify(filteredScenarios));
      return true;
    } catch (error) {
      console.error(`Error deleting scenario ${id} from localStorage:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get all products for a scenario
  const getProducts = useCallback(async (scenarioId: string): Promise<Product[]> => {
    setIsLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      
      if (!scenario) {
        return [];
      }
      
      return scenario.products || [];
    } catch (error) {
      console.error(`Error getting products for scenario ${scenarioId} from localStorage:`, error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getScenario]);

  // Get a product by ID
  const getProduct = useCallback(async (scenarioId: string, productId: string): Promise<Product | null> => {
    setIsLoading(true);
    try {
      const products = await getProducts(scenarioId);
      const product = products.find(p => p.id === productId);
      return product || null;
    } catch (error) {
      console.error(`Error getting product ${productId} from localStorage:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getProducts]);

  // Create a new product
  const createProduct = useCallback(async (
    scenarioId: string,
    product: Omit<Product, 'id'>
  ): Promise<Product | null> => {
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
      console.error(`Error creating product for scenario ${scenarioId} in localStorage:`, error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getScenario, updateScenario]);

  // Update a product
  const updateProduct = useCallback(async (
    scenarioId: string,
    productOrId: string | Product,
    update?: Partial<Product>
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      
      if (!scenario) {
        return false;
      }
      
      let updatedProducts: Product[];
      
      if (typeof productOrId === 'string' && update) {
        // Update by ID
        const productId = productOrId;
        updatedProducts = scenario.products.map(p => 
          p.id === productId ? { ...p, ...update } : p
        );
      } else if (typeof productOrId === 'object') {
        // Update by product object
        const product = productOrId;
        updatedProducts = scenario.products.map(p => 
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
      console.error(`Error updating product in scenario ${scenarioId} in localStorage:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getScenario, updateScenario]);

  // Delete a product
  const deleteProduct = useCallback(async (scenarioId: string, productId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const scenario = await getScenario(scenarioId);
      
      if (!scenario) {
        return false;
      }
      
      const updatedProducts = scenario.products.filter(p => p.id !== productId);
      
      if (updatedProducts.length === scenario.products.length) {
        return false;
      }
      
      const updatedScenario = {
        ...scenario,
        products: updatedProducts,
      };
      
      return await updateScenario(updatedScenario);
    } catch (error) {
      console.error(`Error deleting product ${productId} from scenario ${scenarioId} in localStorage:`, error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getScenario, updateScenario]);

  return {
    isLoading,
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