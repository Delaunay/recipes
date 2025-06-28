// API service for recipe management
// Use /api prefix to leverage Vite proxy and avoid CORS issues
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Check if we're in static mode (no backend server)
const isStaticMode = () => {
  // Check if we're in production and using static JSON files
  // This works for both local static builds (/api) and GitHub Pages (/recipes/api)
  return import.meta.env.PROD && API_BASE_URL.endsWith('/api');
};

interface RecipeData {
  id?: number;
  title: string;
  description?: string;
  images?: string[];
  instructions: Array<Instruction>;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients?: Array<Ingredient>;
  categories?: Array<Category>;
  author_id?: number;
}

interface Instruction {
  step: string;
  description: string;
  duration?: string;
  image?: string;
}


interface Ingredient {
  id?: number;
  name: string;
  description?: string;
  calories?: number;
  density?: number;
  quantity?: number;
  unit?: string;
}

interface Category {
  id?: number;
  name: string;
  description?: string;
}

interface UnitConversion {
  id?: number;
  from_unit: string;
  to_unit: string;
  conversion_factor: number;
  category: string;
  ingredient_id?: number;
  extension?: any;
}

interface UnitConversionResult {
  quantity: number;
  unit: string;
  ingredient_id: number;
  original_quantity: number;
  original_unit: string;
}

class RecipeAPI {
  private async requestStatic<T>(endpoint: string): Promise<T> {
    // Convert endpoint to static JSON file path
    let jsonPath = endpoint;
    let cleanEndpoint = endpoint.split('?')[0];
    
    if (endpoint === '/') {
      jsonPath = `${API_BASE_URL}/index.json`;
    } else if (endpoint.startsWith('/')) {
      jsonPath = `${API_BASE_URL}${cleanEndpoint}.json`;
    }
    
    // Handle query parameters by removing them for static files
    const cleanPath = jsonPath;

    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('Static API request:', { endpoint, jsonPath, cleanPath });
    }
    
    try {
      const response = await fetch(cleanPath);
      if (!response.ok) {
        throw new Error(`Static file not found: ${cleanPath}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Static API request failed:', error);
      throw new Error(`Failed to load static data from ${cleanPath}`);
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      console.log('API Request:', { 
        endpoint, 
        isStatic: isStaticMode(), 
        apiBaseUrl: API_BASE_URL, 
        isProd: import.meta.env.PROD 
      });
    }
    
    // In static mode, only GET requests are supported
    if (isStaticMode()) {
      if (options.method && options.method !== 'GET') {
        throw new Error('Modifications not supported in static mode');
      }
      return this.requestStatic<T>(endpoint);
    }

    // Development mode - make actual API calls
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Recipe methods
  async getRecipes(): Promise<RecipeData[]> {
    return this.request<RecipeData[]>('/recipes');
  }

  async getRecipe(id: number): Promise<RecipeData> {
    return this.request<RecipeData>(`/recipes/${id}`);
  }

  async getRecipeByName(name: string): Promise<RecipeData> {
    // Convert name to URL-friendly format (replace spaces with hyphens)
    const urlName = name.toLowerCase().replace(/\s+/g, '-');
    return this.request<RecipeData>(`/recipes/${urlName}`);
  }

  async createRecipe(recipe: Omit<RecipeData, 'id'>): Promise<RecipeData> {
    if (isStaticMode()) {
      throw new Error('Creating recipes is not supported in static mode');
    }
    return this.request<RecipeData>('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  }

  async updateRecipe(id: number, recipe: Partial<RecipeData>): Promise<RecipeData> {
    if (isStaticMode()) {
      throw new Error('Updating recipes is not supported in static mode');
    }
    return this.request<RecipeData>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipe),
    });
  }

  async deleteRecipe(id: number): Promise<{ message: string }> {
    if (isStaticMode()) {
      throw new Error('Deleting recipes is not supported in static mode');
    }
    return this.request<{ message: string }>(`/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  // Ingredient methods
  async getIngredients(): Promise<Ingredient[]> {
    return this.request<Ingredient[]>('/ingredients');
  }

  async getIngredient(id: number): Promise<Ingredient> {
    return this.request<Ingredient>(`/ingredients/${id}`);
  }

  async getIngredientByName(name: string): Promise<Ingredient> {
    // Convert name to URL-friendly format (replace spaces with hyphens)
    const urlName = name.toLowerCase().replace(/\s+/g, '-');
    return this.request<Ingredient>(`/ingredients/${urlName}`);
  }

  async createIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
    if (isStaticMode()) {
      throw new Error('Creating ingredients is not supported in static mode');
    }
    return this.request<Ingredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredient),
    });
  }

  async updateIngredient(id: number, ingredient: Partial<Ingredient>): Promise<Ingredient> {
    if (isStaticMode()) {
      throw new Error('Updating ingredients is not supported in static mode');
    }
    return this.request<Ingredient>(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ingredient),
    });
  }

  async deleteIngredient(id: number): Promise<{ message: string }> {
    if (isStaticMode()) {
      throw new Error('Deleting ingredients is not supported in static mode');
    }
    return this.request<{ message: string }>(`/ingredients/${id}`, {
      method: 'DELETE',
    });
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
    if (isStaticMode()) {
      throw new Error('Creating categories is not supported in static mode');
    }
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health');
  }

  // Unit conversion methods
  async getAvailableUnits(ingredientId: number, fromUnit: string): Promise<string[]> {
    return this.request<string[]>(`/units/available/${ingredientId}/${fromUnit}`);
  }

  async convertUnit(ingredientId: number, quantity: number, fromUnit: string, toUnit: string): Promise<UnitConversionResult> {
    const url = `/unit/conversions/${ingredientId}/${fromUnit}/${toUnit}?quantity=1.0`;
    const result = await this.request<UnitConversionResult>(url);
    
    // Scale the returned quantity by the original quantity
    return {
      ...result,
      quantity: result.quantity * quantity,
      original_quantity: quantity
    };
  }

  // Unit conversion CRUD methods
  async getUnitConversions(): Promise<UnitConversion[]> {
    return this.request<UnitConversion[]>('/unit/conversions');
  }

  async getUnitConversion(id: number): Promise<UnitConversion> {
    return this.request<UnitConversion>(`/unit/conversions/${id}`);
  }

  async createUnitConversion(conversion: Omit<UnitConversion, 'id'>): Promise<UnitConversion> {
    if (isStaticMode()) {
      throw new Error('Creating unit conversions is not supported in static mode');
    }
    return this.request<UnitConversion>('/unit/conversions', {
      method: 'POST',
      body: JSON.stringify(conversion),
    });
  }

  async updateUnitConversion(id: number, conversion: Partial<UnitConversion>): Promise<UnitConversion> {
    if (isStaticMode()) {
      throw new Error('Updating unit conversions is not supported in static mode');
    }
    return this.request<UnitConversion>(`/unit/conversions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(conversion),
    });
  }

  async deleteUnitConversion(id: number): Promise<{ message: string }> {
    if (isStaticMode()) {
      throw new Error('Deleting unit conversions is not supported in static mode');
    }
    return this.request<{ message: string }>(`/unit/conversions/${id}`, {
      method: 'DELETE',
    });
  }

  // Image upload
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
    if (isStaticMode()) {
      throw new Error('Image upload is not supported in static mode');
    }

    const formData = new FormData();
    formData.append('file', file);

    const url = `${API_BASE_URL}/upload`;
    const config: RequestInit = {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header, let browser set it with boundary for multipart/form-data
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  }

  // Utility method to check if we're in static mode
  isStaticMode(): boolean {
    return isStaticMode();
  }
}

// Export a singleton instance
export const recipeAPI = new RecipeAPI();
export type { RecipeData, Ingredient, Category, Instruction, UnitConversion, UnitConversionResult }; 