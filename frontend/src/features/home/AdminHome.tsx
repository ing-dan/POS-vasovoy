import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { fetchOrders } from '../../api/orders'
import { fetchSettings } from '../../api/settings'
import { useSessionStore } from '../../store/session'
import { NavIcon } from '../../components/NavIcon'
import type { NavIconKind } from '../../components/NavIcon'

const SHORTCUTS: Array<{ path: string; icon: NavIconKind; title: string; description: string }> = [
  { path: '/app/pedidos', icon: 'orders', title: 'Pedidos', description: 'Tomar, revisar y enviar comandas.' },
  { path: '/app/cocina', icon: 'kitchen', title: 'Cocina', description: 'Ver el avance de las comandas en KDS.' },
  { path: '/app/catalogo', icon: 'catalog', title: 'Catalogo', description: 'Productos, categorias e imagenes.' },
  { path: '/app/usuarios', icon: 'users', title: 'Usuarios', description: 'Cuentas de meseros y roles.' },
  { path: '/app/reportes', icon: 'reports', title: 'Corte', description: 'Ventas recientes y visibilidad de operacion.' },
  { path: '/app/configuracion', icon: 'config', title: 'Configuracion', description: 'Nombre del negocio y ajustes base.' }
]

export function AdminHome() {
  const token = useSessionStore((state) => state.token)

  const settingsQuery = useQuery({
    queryKey: ['settings', token],
    queryFn: () => fetchSettings(token ?? ''),
    enabled: Boolean(token)
  })
  const ordersQuery = useQuery({
    queryKey: ['orders', token],
    queryFn: () => fetchOrders(token ?? ''),
    enabled: Boolean(token),
    refetchInterval: 20000
  })

  const orders = ordersQuery.data?.items ?? []
  const todayKey = new Date().toDateString()
  const todaysOrders = orders.filter((order) => new Date(order.created_at).toDateString() === todayKey)
  const todaysTotal = todaysOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const openOrders = orders.filter((order) => order.status !== 'ready')
  const businessName = settingsQuery.data?.item.business_name ?? 'Restaurante'

  return (
    <section className="home-shell">
      <div className="home-hero">
        <h1>{businessName}</h1>
        <p className="home-subtitle">Panel Admin</p>
        <p className="home-copy">Acceso rapido a operacion, catalogo, usuarios, reportes y configuracion.</p>
      </div>

      <div className="stat-row">
        <article className="panel stat-card">
          <p className="eyebrow">Pedidos de hoy</p>
          <strong>{ordersQuery.isLoading ? '...' : todaysOrders.length}</strong>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Vendido hoy</p>
          <strong>{ordersQuery.isLoading ? '...' : `$${todaysTotal.toFixed(2)}`}</strong>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Pedidos abiertos</p>
          <strong>{ordersQuery.isLoading ? '...' : openOrders.length}</strong>
        </article>
      </div>

      <div className="home-grid">
        {SHORTCUTS.map((shortcut) => (
          <Link key={shortcut.path} to={shortcut.path} className="home-card">
            <span className="home-card-icon">
              <NavIcon kind={shortcut.icon} />
            </span>
            <span className="home-card-title">{shortcut.title}</span>
            <span className="home-card-description">{shortcut.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
