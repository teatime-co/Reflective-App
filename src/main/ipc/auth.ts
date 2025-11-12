import { ipcMain } from 'electron';
import { getSettings, updateSettings, deleteSetting } from '../settings/settingsStore';
import axios from 'axios';

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:setToken', async (_event, token: string) => {
    try {
      updateSettings({ authToken: token });
      return { success: true };
    } catch (error) {
      console.error('Failed to set auth token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auth:getToken', async () => {
    try {
      const settings = getSettings();
      return {
        success: true,
        data: settings.authToken || null,
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auth:clearToken', async () => {
    try {
      deleteSetting('authToken');
      return { success: true };
    } catch (error) {
      console.error('Failed to clear auth token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auth:setUser', async (_event, user: any) => {
    try {
      updateSettings({ currentUser: user });
      return { success: true };
    } catch (error) {
      console.error('Failed to set user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auth:getUser', async () => {
    try {
      const settings = getSettings();
      return {
        success: true,
        data: settings.currentUser || null,
      };
    } catch (error) {
      console.error('Failed to get user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auth:clearUser', async () => {
    try {
      deleteSetting('currentUser');
      return { success: true };
    } catch (error) {
      console.error('Failed to clear user:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auth:updatePrivacyTier', async (
    _event,
    token: string,
    tier: 'local_only' | 'analytics_sync' | 'full_sync',
    hePublicKey?: string | null
  ) => {
    try {
      const settings = getSettings();
      const backendUrl = settings.backendUrl || 'http://localhost:8000';

      const payload = {
        privacy_tier: tier,
        consent_timestamp: new Date().toISOString(),
        he_public_key: hePublicKey || null,
      };

      console.log(`[Auth IPC] Updating privacy tier to ${tier} on backend ${backendUrl}`);

      const response = await axios.put(`${backendUrl}/api/users/me/privacy`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      console.log('[Auth IPC] Privacy tier updated successfully on backend:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('[Auth IPC] Failed to update privacy tier on backend:', error);

      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail;
        const statusCode = error.response?.status;

        return {
          success: false,
          error: detail || `Backend error: ${statusCode || 'Network error'}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  console.log('Auth IPC handlers registered');
}
