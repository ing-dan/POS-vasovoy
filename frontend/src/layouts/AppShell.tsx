import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { fetchSettings } from '../api/settings'
import { useSessionStore } from '../store/session'
import type { UserOut } from '../types/auth'
import { NavIcon } from '../components/NavIcon'
import { navItemsForRole } from './navConfig'

const MAX_BOTTOM_NAV_ITEMS = 4

export function AppShell({ user, logout }: { user: UserOut; logout: () => void }) {
  const token = useSessionStore((state) => state.token)
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const settingsQuery = useQuery({
    queryKey: ['settings', token],
    queryFn: () => fetchSettings(token ?? ''),
    enabled: user.role.code === 'admin' && Boolean(token)
  })

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  const items = navItemsForRole(user.role.code)
  const primaryItems = items.slice(0, MAX_BOTTOM_NAV_ITEMS)
  const overflowItems = items.slice(MAX_BOTTOM_NAV_ITEMS)
  const businessName = settingsQuery.data?.item.business_name ?? 'POS Restaurante'
  const currentItem = items.find((item) => item.path === location.pathname)

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-leading">
          <button
            type="button"
            className="ghost menu-button desktop-hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir navegacion"
          >
            <span className="menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <div className="topbar-copy">
            <p className="eyebrow">{businessName}</p>
            <h1>{currentItem?.label ?? 'POS Restaurante'}</h1>
            <p className="subtle">
              {user.full_name} - {user.role.label}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div className="app-body">
        <nav className="sidebar desktop-only" aria-label="Navegacion principal">
          <div className="sidebar-brand">
            <p className="eyebrow">Menu</p>
          </div>
          {items.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/app'} className={({ isActive }) => (isActive ? 'sidebar-item active' : 'sidebar-item')}>
              <NavIcon kind={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {items.length > 1 ? (
        <nav className="bottom-nav mobile-only" aria-label="Navegacion principal">
          {primaryItems.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/app'} className={({ isActive }) => (isActive ? 'bottom-nav-item active' : 'bottom-nav-item')}>
              <NavIcon kind={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
          {overflowItems.length > 0 ? (
            <button type="button" className="bottom-nav-item" onClick={() => setDrawerOpen(true)}>
              <NavIcon kind="config" />
              <span>Mas</span>
            </button>
          ) : null}
        </nav>
      ) : null}

      <div className={drawerOpen ? 'nav-backdrop open' : 'nav-backdrop'} onClick={() => setDrawerOpen(false)} />
      <aside className={drawerOpen ? 'nav-drawer open' : 'nav-drawer'} aria-label="Menu de secciones">
        <div className="nav-drawer-head">
          <div>
            <p className="eyebrow">Secciones</p>
            <h2>Menu rapido</h2>
          </div>
          <button type="button" className="ghost small" onClick={() => setDrawerOpen(false)}>
            Cerrar
          </button>
        </div>

        <div className="nav-drawer-list">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) => (isActive ? 'drawer-item active' : 'drawer-item')}
            >
              <NavIcon kind={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <button type="button" className="drawer-item danger" onClick={logout}>
          Salir
        </button>
      </aside>
    </div>
  )
}
