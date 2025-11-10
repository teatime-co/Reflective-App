import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  currentModal: string | null;
  isSearchOpen: boolean;
  commandPaletteOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleSearch: () => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentModal: null,
  isSearchOpen: false,
  commandPaletteOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  openModal: (modalId: string) => set({ currentModal: modalId }),

  closeModal: () => set({ currentModal: null }),

  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }))
}));
