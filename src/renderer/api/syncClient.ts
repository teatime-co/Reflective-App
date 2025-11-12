import axios, { AxiosInstance } from 'axios';

export interface EncryptedBackupPayload {
  id: string;
  encrypted_content: string;
  content_iv: string;
  content_tag?: string;
  encrypted_embedding?: string;
  embedding_iv?: string;
  created_at: string;
  updated_at: string;
  device_id: string;
}

export interface BackupResponse {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  device_id: string;
  message: string;
}

export interface FetchBackupsResponse {
  backups: Array<{
    id: string;
    encrypted_content: string;
    content_iv: string;
    content_tag?: string;
    encrypted_embedding?: string;
    embedding_iv?: string;
    created_at: string;
    updated_at: string;
    device_id: string;
  }>;
  has_more: boolean;
  total_count?: number;
}

export interface ConflictData {
  id: string;
  log_id: string;
  local_version: {
    encrypted_content: string;
    iv: string;
    updated_at: string;
    device_id: string;
  };
  remote_version: {
    encrypted_content: string;
    iv: string;
    updated_at: string;
    device_id: string;
  };
  detected_at: string;
}

export interface ResolveConflictRequest {
  chosen_version: 'local' | 'remote' | 'merged';
  final_encrypted_content?: string;
  final_iv?: string;
  final_encrypted_embedding?: string;
  final_embedding_iv?: string;
}

class SyncClient {
  private client: AxiosInstance;
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = 'http://localhost:8000/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });
  }

  setBackendURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  async uploadBackup(payload: EncryptedBackupPayload): Promise<BackupResponse> {
    try {
      const response = await this.client.post<BackupResponse>('/sync/backup', payload);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 409) {
          throw new Error('CONFLICT:' + JSON.stringify(error.response.data.detail));
        }
        if (error.response.status === 403) {
          throw new Error('PRIVACY_TIER:' + error.response.data.detail);
        }
        throw new Error(error.response.data.detail || 'Backup upload failed');
      }
      throw new Error('Network error during backup upload');
    }
  }

  async fetchBackups(since?: string, deviceId?: string, limit?: number): Promise<FetchBackupsResponse> {
    try {
      const params: Record<string, string | number> = {};
      if (since) params.since = since;
      if (deviceId) params.device_id = deviceId;
      if (limit) params.limit = limit;

      const response = await this.client.get<FetchBackupsResponse>('/sync/backups', { params });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Fetch backups failed');
      }
      throw new Error('Network error during fetch backups');
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    try {
      await this.client.delete(`/sync/backup/${backupId}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Delete backup failed');
      }
      throw new Error('Network error during delete backup');
    }
  }

  async fetchConflicts(): Promise<{ conflicts: ConflictData[]; total_count: number }> {
    try {
      const response = await this.client.get<{ conflicts: ConflictData[]; total_count: number }>('/sync/conflicts');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Fetch conflicts failed');
      }
      throw new Error('Network error during fetch conflicts');
    }
  }

  async resolveConflict(conflictId: string, resolution: ResolveConflictRequest): Promise<void> {
    try {
      await this.client.post(`/sync/conflicts/${conflictId}/resolve`, resolution);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.detail || 'Resolve conflict failed');
      }
      throw new Error('Network error during resolve conflict');
    }
  }
}

export const syncClient = new SyncClient();
