import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCategories, fetchProducts } from '../../api/catalog'
import { fetchOrders, submitOrder, submitOrderDelta } from '../../api/orders'
import type { UserOut } from '../../types/auth'
import type { Product } from '../../types/catalog'
import type { OrderCartState, OrderDeltaOut, OrderOut } from '../../types/orders'

export function OrderView({ token, user }: { token: string; user: UserOut }) {
  const queryClient = useQueryClient()
  const categoriesQuery = useQuery({
    queryKey: ['categories', token],
    queryFn: () => fetchCategories(token)
  })
  const productsQuery = useQuery({
    queryKey: ['products', token],
    queryFn: () => fetchProducts(token)
  })
  const ordersQuery = useQuery({
    queryKey: ['orders', token],
    queryFn: () => fetchOrders(token),
    refetchInterval: 15000
  })

  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all')
  const [cart, setCart] = useState<OrderCartState>({})
  const [tableLabel, setTableLabel] = useState('Mesa 1')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sentOrder, setSentOrder] = useState<OrderOut | null>(null)
  const [correctionTarget, setCorrectionTarget] = useState<OrderOut | null>(null)
  const [correctionMode, setCorrectionMode] = useState<'add' | 'remove'>('add')

  const categories = categoriesQuery.data?.items ?? []
  const products = productsQuery.data?.items ?? []
  const cartItems = useMemo(() => {
    return products
      .filter((product) => (cart[product.id] ?? 0) > 0)
      .map((product) => ({
        product,
        quantity: cart[product.id] ?? 0,
        lineTotal: product.price * (cart[product.id] ?? 0)
      }))
  }, [cart, products])

  const totalAmount = cartItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const canPlaceOrder = user.role.code === 'admin' || user.role.code === 'waiter'
  const isCorrection = Boolean(correctionTarget)
  const correctionSign = correctionMode === 'remove' ? -1 : 1
  const correctionTotal = isCorrection ? totalAmount * correctionSign : totalAmount

  const mutation = useMutation({
    mutationFn: async () => {
      if (correctionTarget) {
        return submitOrderDelta(token, correctionTarget.id, {
          note: note.trim(),
          items: cartItems.map((item) => ({
            product_id: item.product.id,
            quantity_delta: item.quantity * correctionSign
          }))
        })
      }

      return submitOrder(token, {
        table_label: tableLabel.trim(),
        note: note.trim(),
        items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity
        }))
      })
    },
    onSuccess: async (result: OrderOut | OrderDeltaOut) => {
      setError(null)
      if ('order_id' in result) {
        setSuccess(`Correccion #${result.id} enviada al pedido #${result.order_id}`)
        setSentOrder(null)
      } else {
        setSuccess(`Pedido #${result.id} enviado a cocina`)
        setSentOrder(result)
      }
      setCart({})
      setNote('')
      setTableLabel('Mesa 1')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders', token] }),
        queryClient.invalidateQueries({ queryKey: ['order-deltas', token] }),
        queryClient.invalidateQueries({ queryKey: ['products', token] })
      ])
    },
    onError: (err) => {
      setSuccess(null)
      setSentOrder(null)
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido')
    }
  })

  function addProduct(product: Product) {
    if (!canPlaceOrder) {
      return
    }
    setSuccess(null)
    setSentOrder(null)
    setCart((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }))
  }

  function decrementProduct(productId: number) {
    setSuccess(null)
    setSentOrder(null)
    setCart((current) => {
      const nextQty = (current[productId] ?? 0) - 1
      if (nextQty <= 0) {
        const next = { ...current }
        delete next[productId]
        return next
      }
      return { ...current, [productId]: nextQty }
    })
  }

  function setProductQuantity(productId: number, quantity: number) {
    setSuccess(null)
    setSentOrder(null)
    setCart((current) => {
      if (quantity <= 0) {
        const next = { ...current }
        delete next[productId]
        return next
      }
      return { ...current, [productId]: quantity }
    })
  }

  function removeProduct(productId: number) {
    setProductQuantity(productId, 0)
  }

  function resetCategory() {
    setSelectedCategory('all')
  }

  function chooseCorrectionTarget(order: OrderOut) {
    setCorrectionTarget(order)
    setCorrectionMode('add')
    setSentOrder(null)
    setError(null)
    setSuccess(null)
    setNote('')
    setCart({})
  }

  function clearCorrectionTarget() {
    setCorrectionTarget(null)
    setCorrectionMode('add')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cartItems.length) {
      setError('Agrega al menos un producto')
      return
    }
    mutation.mutate()
  }

  const visibleCategories = selectedCategory === 'all'
    ? categories
    : categories.filter((category) => category.id === selectedCategory)

  const visibleProducts = selectedCategory === 'all'
    ? products
    : products.filter((product) => product.category_id === selectedCategory)

  const groupedProducts = visibleCategories.map((category) => ({
    category,
    products: visibleProducts.filter((product) => product.category_id === category.id)
  }))

  return (
    <section className="order-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Pedidos</p>
          <h2>Toma de pedidos</h2>
          <p className="subtle">Selecciona una categoria o revisa todo el listado ordenado por categoria para armar la comanda.</p>
        </div>
        <div className="catalog-actions">
          <div className="health">
            <span className="dot ok" />
            <span>{ordersQuery.data?.items.length ?? 0} pedidos recientes</span>
          </div>
        </div>
      </header>

      <div className="chip-row">
        <button type="button" className={selectedCategory === 'all' ? 'chip active' : 'chip'} onClick={resetCategory}>
          Todas
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={selectedCategory === category.id ? 'chip active' : 'chip'}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="order-layout">
        <section className="menu-panel">
          {groupedProducts.map((group) => (
            <article key={group.category.id} className="group-block">
              <div className="group-head">
                <div>
                  <p className="eyebrow">{group.category.name}</p>
                  <h3>{group.products.length} productos</h3>
                </div>
              </div>

              <div className="product-grid">
                {group.products.map((product) => (
                  <article key={product.id} className="product-picker-card panel">
                    <div className="product-visual">
                      {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="placeholder">Sin imagen</div>}
                    </div>
                    <div className="product-copy">
                      <div className="product-heading">
                        <div>
                          <h3>{product.name}</h3>
                          <p className="product-description">{product.description || 'Disponible para pedido'}</p>
                        </div>
                        <strong>${product.price.toFixed(2)}</strong>
                      </div>
                      <div className="product-footer">
                        <span className="pill muted">{group.category.name}</span>
                        <button type="button" className="primary small" onClick={() => addProduct(product)} disabled={!canPlaceOrder}>
                          Agregar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ))}

          {!productsQuery.isLoading && groupedProducts.every((group) => group.products.length === 0) ? (
            <div className="panel empty-state">
              <h3>No hay productos en esta categoria</h3>
              <p>Prueba cambiar el filtro de categoria o revisa el catalogo en administracion.</p>
            </div>
          ) : null}
        </section>

        <aside className="panel cart-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Comanda</p>
              <h3>Pedido actual</h3>
            </div>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            {correctionTarget ? (
              <section className="order-confirmation delta-target">
                <p className="eyebrow">Correccion</p>
                <h3>Pedido #{correctionTarget.id}</h3>
                <p>
                  {correctionTarget.table_label} - {correctionTarget.items.length} productos - ${correctionTarget.total_amount.toFixed(2)}
                </p>
                <div className="correction-actions">
                  <span className="pill success">Sin duplicar preparacion</span>
                  <button type="button" className="ghost small" onClick={clearCorrectionTarget}>
                    Quitar referencia
                  </button>
                </div>
                <div className="mode-toggle">
                  <button type="button" className={correctionMode === 'add' ? 'tab active' : 'tab'} onClick={() => setCorrectionMode('add')}>
                    Agregar
                  </button>
                  <button type="button" className={correctionMode === 'remove' ? 'tab active' : 'tab'} onClick={() => setCorrectionMode('remove')}>
                    Quitar
                  </button>
                </div>
              </section>
            ) : null}

            {sentOrder ? (
              <section className="order-confirmation">
                <p className="eyebrow">Confirmado</p>
                <h3>Pedido #{sentOrder.id}</h3>
                <p>
                  {sentOrder.table_label} - {sentOrder.items.length} productos - ${sentOrder.total_amount.toFixed(2)}
                </p>
                <span className="pill success">Enviado a cocina</span>
              </section>
            ) : null}

            <label className="field">
              Mesa
              <input value={tableLabel} onChange={(event) => setTableLabel(event.target.value)} />
            </label>

            <label className="field">
              Nota
              <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Sin cebolla, para llevar, etc."></textarea>
            </label>

            <div className="cart-items">
              {cartItems.length === 0 ? (
                <div className="empty-state">
                  <h3>Sin productos</h3>
                  <p>Agrega productos desde la lista de la izquierda.</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <article key={item.product.id} className="cart-item">
                    <div>
                      <strong>{item.product.name}</strong>
                      <p>{item.quantity} x ${item.product.price.toFixed(2)}</p>
                    </div>
                    <div className="cart-actions">
                      <button type="button" className="ghost small" onClick={() => decrementProduct(item.product.id)}>
                        -
                      </button>
                      <input
                        className="quantity-input"
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) => setProductQuantity(item.product.id, Number(event.target.value) || 0)}
                        aria-label={`Cantidad de ${item.product.name}`}
                      />
                      <button type="button" className="ghost small" onClick={() => addProduct(item.product)}>
                        +
                      </button>
                      <button type="button" className="ghost small danger" onClick={() => removeProduct(item.product.id)}>
                        Quitar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="total-row">
              <span>{correctionTarget ? 'Ajuste' : 'Total'}</span>
              <strong className={correctionTotal < 0 ? 'negative-amount' : ''}>
                {correctionTotal < 0 ? '-' : ''}${Math.abs(correctionTotal).toFixed(2)}
              </strong>
            </div>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}

            <button type="submit" className="primary" disabled={mutation.isPending || !canPlaceOrder || cartItems.length === 0}>
              {mutation.isPending ? 'Enviando...' : correctionTarget ? 'Enviar correccion' : 'Enviar pedido'}
            </button>
          </form>

          <section className="recent-orders">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Recientes</p>
                <h3>Ultimos pedidos</h3>
              </div>
            </div>
            <div className="recent-list">
              {(ordersQuery.data?.items ?? []).map((order) => (
                <article key={order.id} className={correctionTarget?.id === order.id ? 'recent-order selected' : 'recent-order'}>
                  <div className="recent-order-head">
                    <strong>{order.table_label}</strong>
                    <span className="pill muted">{order.status}</span>
                  </div>
                  <p>
                    {order.items.length} productos - ${order.total_amount.toFixed(2)}
                  </p>
                  <button type="button" className="ghost small" onClick={() => chooseCorrectionTarget(order)}>
                    Corregir pedido
                  </button>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  )
}
