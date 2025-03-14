import { BoredGamerConfig, ApiResponse } from './types';

export class HttpClient {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: BoredGamerConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.boredgamer.com';
  }

  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined
      });

      const result = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

      if (!response.ok) {
        throw {
          success: false,
          data: null,
          error: result.error || result.message || `HTTP error ${response.status}`
        };
      }

      return result;
    } catch (error: any) {
      if (error.success === false) {
        throw error;
      }
      throw {
        success: false,
        data: null,
        error: error.message || 'Network request failed'
      };
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>('POST', endpoint, data);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }
}
