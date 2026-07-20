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
    const token = window.localStorage.getItem(STORAGE_KEY)
    set({ token, hydrated: true })
  },
  setToken: (token) => {
    window.localStorage.setItem(STORAGE_KEY, token)
    set({ token })
  },
  logout: () => {
    window.localStorage.removeItem(STORAGE_KEY)
    set({ token: null })
  }
}))

