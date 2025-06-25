// API service for recipe management
// Use /api prefix to leverage Vite proxy and avoid CORS issues
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

class RecipeAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    return this.request<RecipeData>('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  }

  async updateRecipe(id: number, recipe: Partial<RecipeData>): Promise<RecipeData> {
    return this.request<RecipeData>(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(recipe),
    });
  }

  async deleteRecipe(id: number): Promise<{ message: string }> {
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
    return this.request<Ingredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredient),
    });
  }

  async updateIngredient(id: number, ingredient: Partial<Ingredient>): Promise<Ingredient> {
    return this.request<Ingredient>(`/ingredients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ingredient),
    });
  }

  async deleteIngredient(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/ingredients/${id}`, {
      method: 'DELETE',
    });
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  async createCategory(category: Omit<Category, 'id'>): Promise<Category> {
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

  async convertUnit(ingredientId: number, quantity: number, fromUnit: string, toUnit: string): Promise<{
    quantity: number;
    unit: string;
    ingredient_id: number;
    original_quantity: number;
    original_unit: string;
  }> {
    const url = `/unit/conversions/${ingredientId}/${fromUnit}/${toUnit}?quantity=${quantity}`;
    return this.request<{
      quantity: number;
      unit: string;
      ingredient_id: number;
      original_quantity: number;
      original_unit: string;
    }>(url);
  }

  // Unit conversion CRUD methods
  async getUnitConversions(): Promise<UnitConversion[]> {
    return this.request<UnitConversion[]>('/unit/conversions');
  }

  async getUnitConversion(id: number): Promise<UnitConversion> {
    return this.request<UnitConversion>(`/unit/conversions/${id}`);
  }

  async createUnitConversion(conversion: Omit<UnitConversion, 'id'>): Promise<UnitConversion> {
    return this.request<UnitConversion>('/unit/conversions', {
      method: 'POST',
      body: JSON.stringify(conversion),
    });
  }

  async updateUnitConversion(id: number, conversion: Partial<UnitConversion>): Promise<UnitConversion> {
    return this.request<UnitConversion>(`/unit/conversions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(conversion),
    });
  }

  async deleteUnitConversion(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/unit/conversions/${id}`, {
      method: 'DELETE',
    });
  }

  // Image upload
  async uploadImage(file: File): Promise<{ url: string; filename: string }> {
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
}

// Export a singleton instance
export const recipeAPI = new RecipeAPI();
export type { RecipeData, Ingredient, Category, Instruction, UnitConversion }; 