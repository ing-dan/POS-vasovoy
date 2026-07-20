import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { fetchOrders } from '../../api/orders'
import type { OrderOut } from '../../types/orders'

const STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado',
  preparing: 'En preparacion',
  ready: 'Listo'
}

export function ReportsView({ token }: { token: string }) {
  const ordersQuery = useQuery({
    queryKey: ['orders', token],
    queryFn: () => fetchOrders(token),
    refetchInterval: 20000
  })

  const orders = ordersQuery.data?.items ?? []

  const summary = useMemo(() => {
    const todayKey = new Date().toDateString()
    const todaysOrders = orders.filter((order) => new Date(order.created_at).toDateString() === todayKey)
    const total = todaysOrders.reduce((sum, order) => sum + order.total_amount, 0)
    const averageTicket = todaysOrders.length ? total / todaysOrders.length : 0

    const byStatus = todaysOrders.reduce<Record<string, { count: number; total: number }>>((acc, order) => {
      const bucket = acc[order.status] ?? { count: 0, total: 0 }
      bucket.count += 1
      bucket.total += order.total_amount
      acc[order.status] = bucket
      return acc
    }, {})

    return { todaysOrders, total, averageTicket, byStatus }
  }, [orders])

  return (
    <section className="catalog-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Corte</p>
          <h2>Resumen del dia</h2>
          <p className="subtle">
            Vista calculada a partir de los pedidos mas recientes. Para un corte historico completo por rango de
            fechas, el siguiente paso tecnico es agregar un endpoint de reportes en el backend.
          </p>
        </div>
      </header>

      <div className="stat-row">
        <article className="panel stat-card">
          <p className="eyebrow">Pedidos hoy</p>
          <strong>{ordersQuery.isLoading ? '...' : summary.todaysOrders.length}</strong>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Total vendido</p>
          <strong>{ordersQuery.isLoading ? '...' : `$${summary.total.toFixed(2)}`}</strong>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Ticket promedio</p>
          <strong>{ordersQuery.isLoading ? '...' : `$${summary.averageTicket.toFixed(2)}`}</strong>
        </article>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Por estado</p>
            <h3>Avance de cocina hoy</h3>
          </div>
        </div>
        <div className="catalog-list">
          {Object.entries(summary.byStatus).length === 0 ? (
            <div className="empty-state">
              <h3>Sin pedidos hoy todavia</h3>
              <p>En cuanto se envie el primer pedido, aparecera aqui.</p>
            </div>
          ) : (
            Object.entries(summary.byStatus).map(([status, bucket]) => (
              <article key={status} className="panel category-card">
                <div className="product-heading">
                  <div>
                    <p className="eyebrow">{STATUS_LABEL[status] ?? status}</p>
                    <h3>{bucket.count} pedidos</h3>
                  </div>
                  <span className="pill muted">${bucket.total.toFixed(2)}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Detalle</p>
            <h3>Pedidos de hoy</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table className="catalog-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {summary.todaysOrders.map((order: OrderOut) => (
                <tr key={order.id}>
                  <td>{order.table_label}</td>
                  <td>
                    <span className="pill muted">{STATUS_LABEL[order.status] ?? order.status}</span>
                  </td>
                  <td>${order.total_amount.toFixed(2)}</td>
                  <td>{new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
