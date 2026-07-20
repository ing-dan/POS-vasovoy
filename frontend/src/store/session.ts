import { create } from 'zustand'

const STORAGE_KEY = 'pos-restaurante-token'

type SessionState = {
  token: string | null
  hydrated: boolean
  hydrate: () => void
  setToken: (token: string) => void
  logout: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  hydrated: false,
  hydrate: () => {
    const token = window.sessionStorage.getItem(STORAGE_KEY)
    set({ token, hydrated: true })
  },
  setToken: (token) => {
    window.sessionStorage.setItem(STORAGE_KEY, token)
    set({ token })
  },
  logout: () => {
    window.sessionStorage.removeItem(STORAGE_KEY)
    set({ token: null })
  }
}))

