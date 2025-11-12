import axios, { AxiosInstance } from 'axios';
import type { LoginRequest, RegisterRequest, AuthResponse, TokenResponse, PrivacyTierUpdateRequest, PrivacySettingsResponse } from '../../types/auth';

class AuthClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = 'http://localhost:8000/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setBackendURL(url: string): void {
    this.baseURL = url;
    this.client = axios.create({
      baseURL: url,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async register(request: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.client.post<AuthResponse>('/auth/register', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'string') {
          throw new Error(detail);
        } else if (Array.isArray(detail)) {
          const messages = detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
          throw new Error(messages || 'Registration failed');
        }
        throw new Error('Registration failed');
      }
      throw new Error('Network error during registration');
    }
  }

  async login(request: LoginRequest): Promise<TokenResponse> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', request.email);
      formData.append('password', request.password);

      const response = await this.client.post<TokenResponse>('/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'string') {
          throw new Error(detail);
        } else if (Array.isArray(detail)) {
          const messages = detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
          throw new Error(messages || 'Login failed');
        }
        throw new Error('Login failed');
      }
      throw new Error('Network error during login');
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await this.client.get('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getCurrentUser(token: string): Promise<AuthResponse> {
    try {
      const response = await this.client.get<AuthResponse>('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'string') {
          throw new Error(detail);
        }
        throw new Error('Failed to fetch user details');
      }
      throw new Error('Network error while fetching user');
    }
  }

  async updatePrivacyTier(
    token: string,
    tier: 'local_only' | 'analytics_sync' | 'full_sync',
    hePublicKey?: string | null
  ): Promise<PrivacySettingsResponse> {
    try {
      const payload: PrivacyTierUpdateRequest = {
        privacy_tier: tier,
        consent_timestamp: new Date().toISOString(),
        he_public_key: hePublicKey || null,
      };

      const response = await this.client.put<PrivacySettingsResponse>('/users/me/privacy', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'string') {
          throw new Error(detail);
        }
        throw new Error('Failed to update privacy tier');
      }
      throw new Error('Network error while updating privacy tier');
    }
  }
}

export const authClient = new AuthClient();
