export enum PrivacyTier {
  LOCAL_ONLY = 'local_only',
  ANALYTICS_SYNC = 'analytics_sync',
  FULL_SYNC = 'full_sync',
}

export interface AppSettings {
  privacyTier: PrivacyTier;
  backendUrl: string;
  lastSyncTime: number | null;
  deviceId: string;
  syncEnabled: boolean;
}

export interface SettingsUpdateResult {
  success: boolean;
  settings?: AppSettings;
  error?: string;
}
