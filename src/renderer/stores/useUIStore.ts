import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  currentModal: string | null;
  isSearchOpen: boolean;
  commandPaletteOpen: boolean;
  visitedEntries: Set<number>;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleSearch: () => void;
  toggleCommandPalette: () => void;
  markEntryAsVisited: (entryId: number) => void;
  isEntryVisited: (entryId: number) => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  currentModal: null,
  isSearchOpen: false,
  commandPaletteOpen: false,
  visitedEntries: new Set<number>(),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  openModal: (modalId: string) => set({ currentModal: modalId }),

  closeModal: () => set({ currentModal: null }),

  toggleSearch: () => set((state) => ({ isSearchOpen: !state.isSearchOpen })),

  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  markEntryAsVisited: (entryId: number) => {
    const newVisited = new Set(get().visitedEntries);
    newVisited.add(entryId);
    set({ visitedEntries: newVisited });
  },

  isEntryVisited: (entryId: number) => {
    return get().visitedEntries.has(entryId);
  }
}));
