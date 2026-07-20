import { create } from 'zustand'

type UiState = {
  activeView: 'home' | 'catalog' | 'users' | 'orders' | 'kitchen' | 'reports' | 'config'
  setActiveView: (view: UiState['activeView']) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeView: 'home',
  setActiveView: (activeView) => set({ activeView })
}))
