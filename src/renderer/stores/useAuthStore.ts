import { create } from 'zustand';
import type { AuthUser, LoginRequest, RegisterRequest } from '../../types/auth';
import { authClient } from '../api/authClient';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (request: LoginRequest) => Promise<boolean>;
  register: (request: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (request: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const tokenResponse = await authClient.login(request);

      await window.electronAPI.auth.setToken(tokenResponse.access_token);

      const userResponse = await authClient.getCurrentUser(tokenResponse.access_token);

      const user: AuthUser = {
        id: userResponse.id,
        email: userResponse.email,
        display_name: userResponse.display_name,
        privacy_tier: userResponse.privacy_tier,
        created_at: userResponse.created_at,
      };

      await window.electronAPI.auth.setUser(user);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({ error: errorMessage, isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  register: async (request: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const userResponse = await authClient.register(request);

      const tokenResponse = await authClient.login({
        email: request.email,
        password: request.password,
      });

      await window.electronAPI.auth.setToken(tokenResponse.access_token);

      const user: AuthUser = {
        id: userResponse.id,
        email: userResponse.email,
        display_name: userResponse.display_name,
        privacy_tier: userResponse.privacy_tier,
        created_at: userResponse.created_at,
      };

      await window.electronAPI.auth.setUser(user);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      set({ error: errorMessage, isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      await window.electronAPI.auth.clearToken();
      await window.electronAPI.auth.clearUser();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      set({ error: errorMessage, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const tokenResult = await window.electronAPI.auth.getToken();
      if (!tokenResult.success || !tokenResult.data) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const isValid = await authClient.verifyToken(tokenResult.data);
      if (!isValid) {
        await window.electronAPI.auth.clearToken();
        await window.electronAPI.auth.clearUser();
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const userResult = await window.electronAPI.auth.getUser();
      if (userResult.success && userResult.data) {
        set({
          user: userResult.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        await window.electronAPI.auth.clearToken();
        await window.electronAPI.auth.clearUser();
        set({ isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication check failed';
      set({ error: errorMessage, isAuthenticated: false, isLoading: false });
    }
  },

  initAuth: async () => {
    await get().checkAuth();
  },

  clearError: () => {
    set({ error: null });
  },
}));
