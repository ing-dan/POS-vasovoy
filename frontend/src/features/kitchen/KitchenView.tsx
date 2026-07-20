import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchOrderDeltas, fetchOrders, updateOrderDeltaStatus, updateOrderStatus } from '../../api/orders'
import type { OrderDeltaOut, OrderOut, WorkflowStatus } from '../../types/orders'

export function KitchenView({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const kitchenOrdersQuery = useQuery({
    queryKey: ['kitchen-orders', token],
    queryFn: () => fetchOrders(token, 'sent,preparing,ready'),
    refetchInterval: 10000
  })
  const kitchenDeltasQuery = useQuery({
    queryKey: ['order-deltas', token],
    queryFn: () => fetchOrderDeltas(token, 'sent,preparing,ready'),
    refetchInterval: 10000
  })

  const mutation = useMutation<OrderOut | OrderDeltaOut, Error, { kind: 'order' | 'delta'; id: number; status: WorkflowStatus }>({
    mutationFn: ({ kind, id, status }) =>
      kind === 'order' ? updateOrderStatus(token, id, status) : updateOrderDeltaStatus(token, id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kitchen-orders', token] })
      await queryClient.invalidateQueries({ queryKey: ['order-deltas', token] })
      await queryClient.invalidateQueries({ queryKey: ['orders', token] })
    }
  })

  const orders = kitchenOrdersQuery.data?.items ?? []
  const deltas = kitchenDeltasQuery.data?.items ?? []
  const cards = [
    ...orders.map((order) => ({
      kind: 'order' as const,
      id: order.id,
      title: `Pedido #${order.id}`,
      subtitle: order.table_label,
      status: order.status,
      total: order.total_amount,
      items: order.items.map((item) => ({
        id: item.id,
        label: `${item.quantity}x`,
        name: item.product_name
      }))
    })),
    ...deltas.map((delta) => ({
      kind: 'delta' as const,
      id: delta.id,
      title: `Correccion #${delta.id}`,
      subtitle: `Pedido #${delta.order_id} - ${delta.order_table_label}`,
      status: delta.status,
      total: delta.items.reduce((sum, item) => sum + item.line_total, 0),
      items: delta.items.map((item) => ({
        id: item.id,
        label: item.quantity_delta > 0 ? `+${item.quantity_delta}` : `${item.quantity_delta}`,
        name: item.product_name
      }))
    }))
  ]
  const grouped = {
    sent: cards.filter((card) => card.status === 'sent'),
    preparing: cards.filter((card) => card.status === 'preparing'),
    ready: cards.filter((card) => card.status === 'ready')
  }

  function advanceStatus(card: { kind: 'order' | 'delta'; id: number; status: WorkflowStatus }) {
    const nextStatus = card.status === 'sent' ? 'preparing' : card.status === 'preparing' ? 'ready' : 'ready'
    mutation.mutate({ kind: card.kind, id: card.id, status: nextStatus })
  }

  return (
    <section className="order-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Kitchen</p>
          <h2>Comandas en preparacion</h2>
          <p className="subtle">Marca el avance de cada pedido y correccion conforme sale de cocina.</p>
        </div>
        <div className="catalog-actions">
          <div className="health">
            <span className="dot ok" />
            <span>{cards.length} tarjetas visibles</span>
          </div>
        </div>
      </header>

      <div className="kitchen-board">
        {(['sent', 'preparing', 'ready'] as const).map((status) => (
          <section key={status} className="panel kitchen-column">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{status === 'sent' ? 'Pendientes' : status === 'preparing' ? 'En proceso' : 'Listos'}</p>
                <h3>{grouped[status].length} tarjetas</h3>
              </div>
            </div>

            <div className="kitchen-list">
              {grouped[status].length === 0 ? (
                <div className="empty-state">
                  <h3>Sin pedidos</h3>
                  <p>Los pedidos apareceran aqui cuando el mesero los envie.</p>
                </div>
              ) : (
                grouped[status].map((card) => (
                  <article key={`${card.kind}-${card.id}`} className="kitchen-order-card">
                    <div className="recent-order-head">
                      <strong>{card.title}</strong>
                      <span className="pill muted">{card.kind === 'order' ? 'Pedido' : 'Correccion'}</span>
                    </div>
                    <p>
                      {card.subtitle} - {card.items.length} movimientos - ${Math.abs(card.total).toFixed(2)}
                    </p>
                    <ul className="kitchen-items">
                      {card.items.map((item) => (
                        <li key={item.id}>
                          <strong>{item.label}</strong> {item.name}
                        </li>
                      ))}
                    </ul>
                    {card.status !== 'ready' ? (
                      <button
                        type="button"
                        className="primary small"
                        onClick={() => advanceStatus(card)}
                        disabled={mutation.isPending}
                      >
                        {card.status === 'sent' ? 'Pasar a preparacion' : 'Marcar como listo'}
                      </button>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
