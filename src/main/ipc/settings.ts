import { ipcMain } from 'electron';
import { getSettings, updateSettings, resetSettings } from '../settings/settingsStore';
import type { AppSettings, SettingsUpdateResult } from '../../types/settings';
import { PrivacyTier } from '../../types/settings';
import { handleTierChange, TierTransitionProgress } from '../sync/tierTransitions';

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
    async (event, partial: Partial<AppSettings>): Promise<SettingsUpdateResult> => {
      try {
        const oldSettings = getSettings();
        const oldTier = oldSettings.privacyTier;
        const newTier = partial.privacyTier;

        if (newTier && oldTier !== newTier) {
          console.log(`Privacy tier change detected: ${oldTier} -> ${newTier}`);

          const result = await handleTierChange(
            oldTier,
            newTier,
            oldSettings.backendUrl || 'http://localhost:8000',
            oldSettings.authToken || null,
            (progress: TierTransitionProgress) => {
              event.sender.send('settings:tier-transition-progress', progress);
            }
          );

          if (!result.success) {
            console.error(`Tier transition failed: ${result.error}`);
            return {
              success: false,
              error: result.error || 'Tier transition failed',
            };
          }

          console.log(`Tier transition completed: ${result.processed} items processed`);

          updateSettings(partial);
          console.log(`Settings updated to new tier: ${newTier}`);
        } else {
          updateSettings(partial);
        }

        const settings = getSettings();
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
