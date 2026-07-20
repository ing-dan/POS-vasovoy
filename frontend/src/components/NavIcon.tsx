export type NavIconKind = 'home' | 'catalog' | 'orders' | 'kitchen' | 'users' | 'reports' | 'config'

export function NavIcon({ kind }: { kind: NavIconKind }) {
  switch (kind) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 11.5 12 4l8 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10v9h12v-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'catalog':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 4h14l2 4v12H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 4v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 11h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 15h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h10l4 4v14H6z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 10h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 14h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 6h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'kitchen':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 10h14l-1.2 9H6.2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8 10V6a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 13.5v3M12 13.5v3M15 13.5v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M2.5 21c.8-3.6 3.6-5.5 5.5-5.5S12.7 17.4 13.5 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M14.8 13.8c2.1.1 4.2 1.8 4.9 4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 19h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 16v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M11 16V8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 16v-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="m9 10 3-3 3 2 4-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'config':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10.5 4.5h3l.5 2.2a7.7 7.7 0 0 1 1.7.7l2-1.1 2.1 2.1-1.1 2a7.7 7.7 0 0 1 .7 1.7l2.2.5v3l-2.2.5a7.7 7.7 0 0 1-.7 1.7l1.1 2-2.1 2.1-2-1.1a7.7 7.7 0 0 1-1.7.7l-.5 2.2h-3l-.5-2.2a7.7 7.7 0 0 1-1.7-.7l-2 1.1-2.1-2.1 1.1-2a7.7 7.7 0 0 1-.7-1.7L1.5 14v-3l2.2-.5a7.7 7.7 0 0 1 .7-1.7l-1.1-2 2.1-2.1 2 1.1a7.7 7.7 0 0 1 1.7-.7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
  }
}
