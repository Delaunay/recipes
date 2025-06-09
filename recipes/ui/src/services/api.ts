// API service for recipe management
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface RecipeData {
  id?: number;
  title: string;
  description?: string;
  images?: string[];
  instructions: Array<{
    step: string;
    description: string;
    duration?: string;
    image?: string;
  }>;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients?: Array<{
    id?: number;
    name: string;
    description?: string;
    calories?: number;
    density?: number;
    quantity?: number;
    unit?: string;
  }>;
  categories?: Array<{
    id?: number;
    name: string;
    description?: string;
  }>;
  author_id?: number;
}

interface Ingredient {
  id?: number;
  name: string;
  description?: string;
  calories?: number;
  density?: number;
}

interface Category {
  id?: number;
  name: string;
  description?: string;
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

  async createIngredient(ingredient: Omit<Ingredient, 'id'>): Promise<Ingredient> {
    return this.request<Ingredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(ingredient),
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
}

// Export a singleton instance
export const recipeAPI = new RecipeAPI();
export type { RecipeData, Ingredient, Category }; 