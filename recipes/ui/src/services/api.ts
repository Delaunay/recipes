// API service for recipe management
// Use /api prefix to leverage Vite proxy and avoid CORS issues


const USE_STATIC_MODE = import.meta.env.VITE_USE_STATIC_MODE === 'true';
const API_BASE_URL = USE_STATIC_MODE ? '/recipes/api' : "/api";

console.log(USE_STATIC_MODE, API_BASE_URL)

// Check if we're in static mode (no backend server)
const isStaticMode = () => {
  // Check if we're in production and using static JSON files
  // This works for both local static builds (/api) and GitHub Pages (/recipes/api)
  return USE_STATIC_MODE && API_BASE_URL.endsWith('/api');
};


function imagePath(image: string): string {
  return API_BASE_URL + image;
}

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


interface RecipeIngredient {
  ingredient_id?: number;
  name: string;
  description?: string;
  calories?: number;
  density?: number;
  quantity?: number;
  unit?: string;
}

interface Ingredient {
  id?: number;
  name: string;
  description?: string;
  calories?: number;
  density?: number;
  extension?: any;
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

interface ConversionMatrix {
  ingredient: Ingredient;
  volume_units: string[];
  weight_units: string[];
  conversions: {
    [volumeUnit: string]: {
      [weightUnit: string]: number | null;
    };
  };
}

interface Task {
  id?: number;
  title: string;
  description?: string;
  datetime_deadline?: string;
  done: boolean;
  priority?: number;
  price_budget?: number;
  price_real?: number;
  people_count?: number;
  template: boolean;
  recuring: boolean;
  active: boolean;
  extension?: any;
  parent_subtasks?: SubTask[];
  child_subtasks?: SubTask[];
}

interface SubTask {
  id?: number;
  parent_id: number;
  child_id: number;
  parent?: Task;
  child?: Task;
}

interface Event {
  id?: number;
  title: string;
  description?: string;
  datetime_start: string;
  datetime_end: string;
  location?: string;
  color?: string;
  kind?: number;
  done: boolean;
  price_budget?: number;
  price_real?: number;
  people_count?: number;
  template: boolean;
  recuring: boolean;
  active: boolean;
  extension?: any;
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

  async getIngredientConversionMatrix(id: number): Promise<ConversionMatrix> {
    return this.request<ConversionMatrix>(`/ingredients/${id}/conversion-matrix`);
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
  async uploadImage(file: File, namespace?: string): Promise<{ url: string; filename: string; folder: string }> {
    if (isStaticMode()) {
      throw new Error('Image upload is not supported in static mode');
    }

    const formData = new FormData();
    formData.append('file', file);

    // Add namespace if provided
    if (namespace) {
      formData.append('namespace', namespace);
    }

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

  // Task methods
  async getTasks(): Promise<Task[]> {
    return this.request<Task[]>('/tasks');
  }

  async getTask(id: number): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    if (isStaticMode()) {
      throw new Error('Creating tasks is not supported in static mode');
    }
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: number, task: Partial<Task>): Promise<void> {
    if (isStaticMode()) {
      throw new Error('Updating tasks is not supported in static mode');
    }
    console.log('API updateTask - sending to server:', task);
    console.log('API updateTask - JSON stringified:', JSON.stringify(task));
    await this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  }

  async deleteTask(id: number): Promise<{ message: string }> {
    if (isStaticMode()) {
      throw new Error('Deleting tasks is not supported in static mode');
    }
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // SubTask methods
  async getSubtasks(): Promise<SubTask[]> {
    return this.request<SubTask[]>('/subtasks');
  }

  async createSubtask(subtask: Omit<SubTask, 'id'>): Promise<SubTask> {
    if (isStaticMode()) {
      throw new Error('Creating subtasks is not supported in static mode');
    }
    return this.request<SubTask>('/subtasks', {
      method: 'POST',
      body: JSON.stringify(subtask),
    });
  }

  // Event methods
  async getEvents(startDate?: string, endDate?: string): Promise<Event[]> {
    let endpoint = '/events';
    if (startDate && endDate) {
      endpoint += `?start=${startDate}&end=${endDate}`;
    }
    return this.request<Event[]>(endpoint);
  }

  async getEvent(id: number): Promise<Event> {
    return this.request<Event>(`/events/${id}`);
  }

  async createEvent(event: Omit<Event, 'id'>): Promise<Event> {
    if (isStaticMode()) {
      throw new Error('Creating events is not supported in static mode');
    }
    return this.request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  async updateEvent(id: number, event: Partial<Event>): Promise<Event> {
    if (isStaticMode()) {
      throw new Error('Updating events is not supported in static mode');
    }
    return this.request<Event>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  }

  async deleteEvent(id: number): Promise<{ message: string }> {
    if (isStaticMode()) {
      throw new Error('Deleting events is not supported in static mode');
    }
    return this.request<{ message: string }>(`/events/${id}`, {
      method: 'DELETE',
    });
  }
}

// Export a singleton instance
export const recipeAPI = new RecipeAPI();
export { imagePath };
export type { RecipeData, Ingredient, RecipeIngredient, Category, Instruction, UnitConversion, UnitConversionResult, ConversionMatrix, Task, SubTask, Event };