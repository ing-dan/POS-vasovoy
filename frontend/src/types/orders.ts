export type WorkflowStatus = 'sent' | 'preparing' | 'ready'

export type OrderItemOut = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
  note: string | null
}

export type OrderOut = {
  id: number
  restaurant_id: number
  created_by_user_id: number
  table_label: string
  status: WorkflowStatus
  note: string | null
  total_amount: number
  created_at: string
  updated_at: string
  items: OrderItemOut[]
}

export type OrderDeltaItemOut = {
  id: number
  product_id: number
  product_name: string
  quantity_delta: number
  unit_price: number
  line_total: number
  note: string | null
}

export type OrderDeltaOut = {
  id: number
  restaurant_id: number
  order_id: number
  created_by_user_id: number
  order_table_label: string
  order_status: string
  status: WorkflowStatus
  note: string | null
  created_at: string
  updated_at: string
  items: OrderDeltaItemOut[]
}

export type OrderCartState = Record<number, number>
