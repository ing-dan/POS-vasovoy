import type { NavIconKind } from '../components/NavIcon'

export type NavItem = {
  path: string
  label: string
  icon: NavIconKind
}

// Una sola fuente de verdad para la navegacion. Antes existian dos sistemas
// distintos (tiles de admin + tabs de mesero/cocina) que no compartian
// definicion. Ahora cada rol simplemente filtra esta lista.
export const NAV_ITEMS: Record<string, NavItem[]> = {
  admin: [
    { path: '/app', label: 'Inicio', icon: 'home' },
    { path: '/app/pedidos', label: 'Pedidos', icon: 'orders' },
    { path: '/app/cocina', label: 'Cocina', icon: 'kitchen' },
    { path: '/app/catalogo', label: 'Catalogo', icon: 'catalog' },
    { path: '/app/usuarios', label: 'Usuarios', icon: 'users' },
    { path: '/app/reportes', label: 'Corte', icon: 'reports' },
    { path: '/app/configuracion', label: 'Configuracion', icon: 'config' }
  ],
  waiter: [{ path: '/app/pedidos', label: 'Pedidos', icon: 'orders' }],
  kitchen: [{ path: '/app/cocina', label: 'Cocina', icon: 'kitchen' }]
}

export function navItemsForRole(roleCode: string): NavItem[] {
  return NAV_ITEMS[roleCode] ?? []
}

export function homePathForRole(roleCode: string): string {
  const items = navItemsForRole(roleCode)
  return items[0]?.path ?? '/app'
}
