import Store from 'electron-store';
import { randomBytes } from 'crypto';
import type { AppSettings } from '../../types/settings';
import { PrivacyTier } from '../../types/settings';

function generateDeviceId(): string {
  return randomBytes(16).toString('hex');
}

const settingsStore = new Store<AppSettings>({
  name: 'reflective-settings',
  defaults: {
    privacyTier: PrivacyTier.LOCAL_ONLY,
    backendUrl: 'http://localhost:8000',
    lastSyncTime: null,
    deviceId: generateDeviceId(),
    syncEnabled: false,
  },
});

export function getSettings(): AppSettings {
  return settingsStore.store;
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const currentSettings = getSettings();
  const updatedSettings = { ...currentSettings, ...partial };

  Object.entries(partial).forEach(([key, value]) => {
    settingsStore.set(key as keyof AppSettings, value);
  });

  return updatedSettings;
}

export function resetSettings(): AppSettings {
  settingsStore.clear();
  return getSettings();
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return settingsStore.get(key);
}
