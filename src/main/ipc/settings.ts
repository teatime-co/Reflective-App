import { ipcMain } from 'electron';
import { getSettings, updateSettings, resetSettings } from '../settings/settingsStore';
import type { AppSettings, SettingsUpdateResult } from '../../types/settings';

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<SettingsUpdateResult> => {
    try {
      const settings = getSettings();
      return {
        success: true,
        settings,
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle(
    'settings:update',
    async (_event, partial: Partial<AppSettings>): Promise<SettingsUpdateResult> => {
      try {
        const settings = updateSettings(partial);
        return {
          success: true,
          settings,
        };
      } catch (error) {
        console.error('Failed to update settings:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  ipcMain.handle('settings:reset', async (): Promise<SettingsUpdateResult> => {
    try {
      const settings = resetSettings();
      return {
        success: true,
        settings,
      };
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
