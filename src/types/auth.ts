export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  privacy_tier: 'local_only' | 'analytics_sync' | 'full_sync';
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
  timezone?: string;
  locale?: string;
}

export interface AuthResponse {
  id: string;
  email: string;
  display_name: string;
  privacy_tier: 'local_only' | 'analytics_sync' | 'full_sync';
  timezone: string;
  locale: string;
  daily_word_goal: number;
  writing_reminder_time: string | null;
  theme_preferences: Record<string, any> | null;
  ai_features_enabled: boolean;
  created_at: string;
  updated_at: string;
  logs_count: number;
  writing_streak: number;
  total_words_written: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface PrivacyTierUpdateRequest {
  privacy_tier: 'local_only' | 'analytics_sync' | 'full_sync';
  consent_timestamp: string;
  he_public_key?: string | null;
}

export interface PrivacySettingsResponse {
  user_id: string;
  privacy_tier: 'local_only' | 'analytics_sync' | 'full_sync';
  consent_timestamp: string;
  he_public_key: string | null;
  updated_at: string;
}
