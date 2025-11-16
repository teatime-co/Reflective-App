import { create } from 'zustand';
import type { AppSettings } from '../../types/settings';

interface SettingsStore {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<boolean>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  isLoading: false,
  error: null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.settings.get();

      if (result.success && result.settings) {
        set({ settings: result.settings, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to load settings', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  updateSetting: async (key, value) => {
    const currentSettings = get().settings;
    if (!currentSettings) {
      console.error('Cannot update setting: settings not loaded');
      return false;
    }

    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.settings.update({ [key]: value });

      if (result.success && result.settings) {
        set({ settings: result.settings, isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Failed to update setting', isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
      return false;
    }
  },

  updateSettings: async (partial) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.settings.update(partial);

      if (result.success && result.settings) {
        set({ settings: result.settings, isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Failed to update settings', isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
      return false;
    }
  },

  resetSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.settings.reset();

      if (result.success && result.settings) {
        set({ settings: result.settings, isLoading: false });
        return true;
      } else {
        set({ error: result.error || 'Failed to reset settings', isLoading: false });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
      return false;
    }
  },
}));
