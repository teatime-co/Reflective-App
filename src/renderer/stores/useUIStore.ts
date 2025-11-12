import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  currentModal: string | null;
  isSearchOpen: boolean;
  commandPaletteOpen: boolean;
  visitedEntries: Set<string>;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleSearch: () => void;
  toggleCommandPalette: () => void;
  markEntryAsVisited: (entryId: string) => void;
  isEntryVisited: (entryId: string) => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  currentModal: null,
  isSearchOpen: false,
  commandPaletteOpen: false,
  visitedEntries: new Set<string>(),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  openModal: (modalId: string) => set({ currentModal: modalId }),

  closeModal: () => set({ currentModal: null }),

  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  markEntryAsVisited: (entryId: string) => {
    const newVisited = new Set(get().visitedEntries);
    newVisited.add(entryId);
    set({ visitedEntries: newVisited });
  },

  isEntryVisited: (entryId: string) => {
    return get().visitedEntries.has(entryId);
  }
}));
