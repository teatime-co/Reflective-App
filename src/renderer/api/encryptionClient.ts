import axios, { AxiosInstance } from 'axios';

export interface HEContext {
  poly_modulus_degree: number;
  coeff_mod_bit_sizes: number[];
  scale: number;
}

export interface EncryptedMetric {
  metric_type: string;
  encrypted_value: string;
  timestamp: string;
}

export interface AggregateQuery {
  metric_type: string;
  operation: 'sum' | 'average';
  time_range?: {
    start: string;
    end: string;
  };
}

export interface AggregateResult {
  encrypted_result: string;
  count: number;
  operation: string;
}

export interface UploadMetricsPayload {
  metrics: EncryptedMetric[];
}

class EncryptionClient {
  private client: AxiosInstance;
  private backendUrl: string;

  constructor(backendUrl: string = 'http://localhost:8000') {
    this.backendUrl = backendUrl;
    this.client = axios.create({
      baseURL: backendUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.error('[EncryptionClient] Unauthorized: token may be expired');
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  public setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  public clearAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  public async fetchHEContext(): Promise<HEContext> {
    const response = await this.client.get<HEContext>('/api/encryption/context');
    return response.data;
  }

  public async uploadEncryptedMetrics(metrics: EncryptedMetric[]): Promise<void> {
    const payload: UploadMetricsPayload = { metrics };
    await this.client.post('/api/encryption/metrics', payload);
  }

  public async fetchAggregateMetrics(query: AggregateQuery): Promise<AggregateResult> {
    const response = await this.client.post<AggregateResult>(
      '/api/encryption/aggregate',
      query
    );
    return response.data;
  }

  public setBackendUrl(url: string): void {
    this.backendUrl = url;
    this.client = axios.create({
      baseURL: url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  public getBackendUrl(): string {
    return this.backendUrl;
  }
}

export const encryptionClient = new EncryptionClient();

export default encryptionClient;
