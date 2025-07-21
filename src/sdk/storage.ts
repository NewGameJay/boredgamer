
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageConfig {
  encrypt: boolean;
  syncWithServer: boolean;
  ttl?: number; // Time to live in milliseconds
}

export class AdvancedStorageManager {
  private cache = new Map<string, { value: any; expires?: number }>();
  
  constructor(
    private adapter: StorageAdapter,
    private config: StorageConfig,
    private httpClient?: any
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && (!cached.expires || cached.expires > Date.now())) {
      return cached.value;
    }

    try {
      const raw = await this.adapter.get(key);
      if (!raw) return null;

      let value = JSON.parse(raw);
      
      if (this.config.encrypt) {
        value = this.decrypt(value);
      }

      // Update cache
      this.cache.set(key, { 
        value, 
        expires: this.config.ttl ? Date.now() + this.config.ttl : undefined 
      });

      return value;
    } catch (error) {
      console.error('[Storage] Failed to get value:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      let processedValue = value;
      
      if (this.config.encrypt) {
        processedValue = this.encrypt(value);
      }

      const serialized = JSON.stringify(processedValue);
      await this.adapter.set(key, serialized);

      // Update cache
      this.cache.set(key, { 
        value, 
        expires: this.config.ttl ? Date.now() + this.config.ttl : undefined 
      });

      // Sync with server if enabled
      if (this.config.syncWithServer && this.httpClient) {
        await this.syncToServer(key, value);
      }
    } catch (error) {
      console.error('[Storage] Failed to set value:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.adapter.remove(key);
      this.cache.delete(key);

      if (this.config.syncWithServer && this.httpClient) {
        await this.httpClient.delete(`/storage/${key}`);
      }
    } catch (error) {
      console.error('[Storage] Failed to remove value:', error);
    }
  }

  private encrypt(value: any): string {
    // Simple XOR encryption for demo - use proper encryption in production
    const key = 'boredgamer_secret_key';
    const str = JSON.stringify(value);
    let result = '';
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
  }

  private decrypt(encrypted: string): any {
    const key = 'boredgamer_secret_key';
    const str = atob(encrypted);
    let result = '';
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return JSON.parse(result);
  }

  private async syncToServer(key: string, value: any): Promise<void> {
    try {
      await this.httpClient.put('/storage', { key, value });
    } catch (error) {
      console.warn('[Storage] Failed to sync to server:', error);
    }
  }
}
