import { apiJson } from '../lib/http'
import type { ListResponse } from '../types/common'
import type { OrderDeltaOut, OrderOut, WorkflowStatus } from '../types/orders'

export async function fetchOrders(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiJson<ListResponse<OrderOut>>(`/orders${query}`, token)
}

export async function fetchOrderDeltas(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiJson<ListResponse<OrderDeltaOut>>(`/orders/deltas${query}`, token)
}

export async function submitOrder(
  token: string,
  payload: {
    table_label: string
    note: string
    items: Array<{ product_id: number; quantity: number; note?: string | null }>
  }
) {
  return apiJson<OrderOut>('/orders', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export async function submitOrderDelta(
  token: string,
  orderId: number,
  payload: {
    note: string
    items: Array<{ product_id: number; quantity_delta: number; note?: string | null }>
  }
) {
  return apiJson<OrderDeltaOut>(`/orders/${orderId}/deltas`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export async function updateOrderStatus(token: string, orderId: number, status: WorkflowStatus) {
  return apiJson<OrderOut>(`/orders/${orderId}/status`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
}

export async function updateOrderDeltaStatus(token: string, deltaId: number, status: WorkflowStatus) {
  return apiJson<OrderDeltaOut>(`/orders/deltas/${deltaId}/status`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
}
