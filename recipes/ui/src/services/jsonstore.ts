const USE_STATIC_MODE = import.meta.env.VITE_USE_STATIC_MODE === 'true';
const API_BASE_URL = USE_STATIC_MODE ? '/recipes/api' : '/api';

class JsonStore {
  async list(collection: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/store/${encodeURIComponent(collection)}`);
    if (!res.ok) throw new Error(`list failed: ${res.status}`);
    return res.json();
  }

  async get<T = any>(collection: string, key: string): Promise<T> {
    const res = await fetch(
      `${API_BASE_URL}/store/${encodeURIComponent(collection)}/${encodeURIComponent(key)}`
    );
    if (!res.ok) throw new Error(`get failed: ${res.status}`);
    return res.json();
  }

  async put<T = any>(collection: string, key: string, data: T): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/store/${encodeURIComponent(collection)}/${encodeURIComponent(key)}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );
    if (!res.ok) throw new Error(`put failed: ${res.status}`);
  }

  async remove(collection: string, key: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/store/${encodeURIComponent(collection)}/${encodeURIComponent(key)}`,
      { method: 'DELETE' }
    );
    if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  }
}

export const jsonStore = new JsonStore();
