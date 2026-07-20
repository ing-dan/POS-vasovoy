import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useSessionStore } from './store/session'
import { useUiStore } from './store/ui'

type Role = {
  id: number
  code: string
  label: string
}

type WorkflowStatus = 'sent' | 'preparing' | 'ready'

type UserOut = {
  id: number
  username: string
  full_name: string
  restaurant_id: number
  role: Role
}

type Category = {
  id: number
  name: string
  sort_order: number
}

type CategoryFormState = {
  name: string
  sortOrder: string
}

type Product = {
  id: number
  restaurant_id: number
  category_id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_active: boolean
  sort_order: number
  category: Category
}

type OrderItemOut = {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
  note: string | null
}

type OrderOut = {
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

type OrderDeltaItemOut = {
  id: number
  product_id: number
  product_name: string
  quantity_delta: number
  unit_price: number
  line_total: number
  note: string | null
}

type OrderDeltaOut = {
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

type ListResponse<T> = {
  items: T[]
}

type LoginResponse = {
  access_token: string
  token_type: string
  user: UserOut
}

type UserAdmin = {
  id: number
  username: string
  full_name: string
  restaurant_id: number
  is_active: boolean
  role: Role
}

type RestaurantSettings = {
  id: number
  restaurant_id: number
  business_name: string
  currency_code: string
  tax_rate: number
  receipt_footer: string | null
  table_label_singular: string
  table_label_plural: string
}

type ProductFormState = {
  name: string
  categoryId: string
  price: string
  description: string
  sortOrder: string
  isActive: boolean
}

type UserFormState = {
  username: string
  fullName: string
  password: string
  roleId: string
  isActive: boolean
}

type SettingsFormState = {
  businessName: string
  currencyCode: string
  taxRate: string
  receiptFooter: string
  tableLabelSingular: string
  tableLabelPlural: string
}

type OrderCartState = Record<number, number>

const emptyProductForm = (): ProductFormState => ({
  name: '',
  categoryId: '',
  price: '',
  description: '',
  sortOrder: '0',
  isActive: true
})

const emptyCategoryForm = (): CategoryFormState => ({
  name: '',
  sortOrder: '0'
})

const emptyUserForm = (): UserFormState => ({
  username: '',
  fullName: '',
  password: '',
  roleId: '',
  isActive: true
})

const emptySettingsForm = (): SettingsFormState => ({
  businessName: '',
  currencyCode: 'MXN',
  taxRate: '0',
  receiptFooter: '',
  tableLabelSingular: 'Mesa',
  tableLabelPlural: 'Mesas'
})

async function apiJson<T>(path: string, token?: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  })

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { detail?: string }
      throw new Error(payload.detail ?? `Error ${response.status}`)
    }
    const text = await response.text()
    throw new Error(text || `Error ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function fetchHealth() {
  return apiJson<{ status: string }>('/health')
}

async function loginRequest(username: string, password: string) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  if (!response.ok) {
    throw new Error('Credenciales invalidas')
  }

  return response.json() as Promise<LoginResponse>
}

async function fetchMe(token: string) {
  return apiJson<UserOut>('/auth/me', token)
}

async function fetchCategories(token: string) {
  return apiJson<ListResponse<Category>>('/catalog/categories', token)
}

async function createCategory(token: string, name: string, sortOrder?: number) {
  return apiJson<{ item: Category }>('/catalog/categories', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      sort_order: sortOrder
    })
  })
}

async function updateCategory(token: string, categoryId: number, form: CategoryFormState) {
  return apiJson<{ item: Category }>(`/catalog/categories/${categoryId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.name.trim(),
      sort_order: Number(form.sortOrder)
    })
  })
}

async function deleteCategory(token: string, categoryId: number) {
  return apiJson<{ ok: boolean }>(`/catalog/categories/${categoryId}`, token, {
    method: 'DELETE'
  })
}

async function deleteProduct(token: string, productId: number) {
  return apiJson<{ ok: boolean }>(`/catalog/products/${productId}`, token, {
    method: 'DELETE'
  })
}

async function fetchProducts(token: string) {
  return apiJson<ListResponse<Product>>('/catalog/products', token)
}

async function fetchOrders(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiJson<ListResponse<OrderOut>>(`/orders${query}`, token)
}

async function fetchOrderDeltas(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiJson<ListResponse<OrderDeltaOut>>(`/orders/deltas${query}`, token)
}

async function fetchUsers(token: string) {
  return apiJson<ListResponse<UserAdmin>>('/users', token)
}

async function fetchRoles(token: string) {
  return apiJson<Role[]>('/auth/roles', token)
}

async function fetchSettings(token: string) {
  return apiJson<{ item: RestaurantSettings }>('/settings', token)
}

async function submitSettings(
  token: string,
  form: SettingsFormState
) {
  return apiJson<{ item: RestaurantSettings }>('/settings', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: form.businessName,
      currency_code: form.currencyCode,
      tax_rate: Number(form.taxRate),
      receipt_footer: form.receiptFooter.trim() || null,
      table_label_singular: form.tableLabelSingular,
      table_label_plural: form.tableLabelPlural
    })
  })
}

async function submitProduct(token: string, productId: number | null, form: ProductFormState, imageFile: File | null) {
  const payload = new FormData()
  payload.append('name', form.name.trim())
  payload.append('category_id', form.categoryId)
  payload.append('price', form.price)
  payload.append('description', form.description)
  payload.append('sort_order', form.sortOrder)
  payload.append('is_active', String(form.isActive))
  if (imageFile) {
    payload.append('image', imageFile)
  }

  const response = await fetch(productId ? `/catalog/products/${productId}` : '/catalog/products', {
    method: productId ? 'PUT' : 'POST',
    body: payload,
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.json() as Promise<{ item: Product }>
}

async function submitOrder(
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

async function submitOrderDelta(
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

async function updateOrderStatus(token: string, orderId: number, status: WorkflowStatus) {
  return apiJson<OrderOut>(`/orders/${orderId}/status`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
}

async function updateOrderDeltaStatus(token: string, deltaId: number, status: WorkflowStatus) {
  return apiJson<OrderDeltaOut>(`/orders/deltas/${deltaId}/status`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
}

async function submitUser(
  token: string,
  userId: number | null,
  payload: {
    username: string
    full_name: string
    role_id: number
    is_active: boolean
    password?: string | null
  }
) {
  return apiJson<{ item: UserAdmin }>(userId ? `/users/${userId}` : '/users', token, {
    method: userId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

function LoginView() {
  const setToken = useSessionStore((state) => state.setToken)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => loginRequest(username, password),
    onSuccess: (data) => {
      setError(null)
      setToken(data.access_token)
    },
    onError: () => {
      setError('No se pudo iniciar sesion')
    }
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <section className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">Acceso</p>
        <h1>Ingreso seguro al POS</h1>
        <p>Autenticacion con token, roles por restaurante y una base lista para operar en caja y en piso.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Usuario
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </section>
  )
}

function CatalogView({ token, user }: { token: string; user: UserOut }) {
  const queryClient = useQueryClient()
  const canEdit = user.role.code === 'admin'
  const categoriesQuery = useQuery({
    queryKey: ['categories', token],
    queryFn: () => fetchCategories(token)
  })
  const productsQuery = useQuery({
    queryKey: ['products', token],
    queryFn: () => fetchProducts(token)
  })

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<ProductFormState>(emptyProductForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<number | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null)
  const editorRef = useRef<HTMLElement | null>(null)
  const categoriesRef = useRef<HTMLElement | null>(null)
  const productsRef = useRef<HTMLElement | null>(null)
  const categoryEditorRef = useRef<HTMLElement | null>(null)

  const categories = categoriesQuery.data?.items ?? []
  const products = productsQuery.data?.items ?? []

  useEffect(() => {
    if (!selectedProduct && !form.categoryId && categories[0]) {
      setForm((current) => ({ ...current, categoryId: String(categories[0].id) }))
    }
  }, [categories, form.categoryId, selectedProduct])

  useEffect(() => {
    if (selectedProduct && editorOpen) {
      setForm({
        name: selectedProduct.name,
        categoryId: String(selectedProduct.category_id),
        price: String(selectedProduct.price),
        description: selectedProduct.description ?? '',
        sortOrder: String(selectedProduct.sort_order),
        isActive: selectedProduct.is_active
      })
      setImageFile(null)
    } else {
      setForm((current) => ({
        ...emptyProductForm(),
        categoryId: current.categoryId || String(categories[0]?.id ?? '')
      }))
      setImageFile(null)
    }
  }, [categories, editorOpen, selectedProduct])

  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile)
      setImagePreview(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }

    setImagePreview(selectedProduct?.image_url ?? null)
    return undefined
  }, [imageFile, selectedProduct])

  useEffect(() => {
    if (editorOpen) {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [editorOpen, selectedProduct])

  const mutation = useMutation({
    mutationFn: () => submitProduct(token, selectedProduct?.id ?? null, form, imageFile),
    onSuccess: async () => {
      setError(null)
      setSelectedProduct(null)
      setEditorOpen(false)
      setImageFile(null)
      setForm(emptyProductForm())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', token] }),
        queryClient.invalidateQueries({ queryKey: ['categories', token] })
      ])
    },
    onError: () => {
      setError('No se pudo guardar el producto')
    }
  })

  const categoryMutation = useMutation({
    mutationFn: () =>
      selectedCategory
        ? updateCategory(token, selectedCategory.id, categoryForm)
        : createCategory(token, categoryForm.name, Number(categoryForm.sortOrder)),
    onSuccess: async () => {
      setCategoryError(null)
      setCategorySuccess('Categoria guardada')
      setCategoryEditorOpen(false)
      setSelectedCategory(null)
      setCategoryForm(emptyCategoryForm())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', token] }),
        queryClient.invalidateQueries({ queryKey: ['products', token] })
      ])
    },
    onError: () => {
      setCategorySuccess(null)
      setCategoryError('No se pudo guardar la categoria')
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => deleteCategory(token, categoryId),
    onSuccess: async () => {
      setCategoryError(null)
      setCategorySuccess('Categoria eliminada')
      setCategoryEditorOpen(false)
      setSelectedCategory(null)
      setCategoryForm(emptyCategoryForm())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', token] }),
        queryClient.invalidateQueries({ queryKey: ['products', token] })
      ])
    },
    onError: (err) => {
      setCategorySuccess(null)
      setCategoryError(err instanceof Error ? err.message : 'No se pudo eliminar la categoria')
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => deleteProduct(token, productId),
    onSuccess: async () => {
      setError(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', token] }),
        queryClient.invalidateQueries({ queryKey: ['categories', token] })
      ])
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto')
    }
  })

  function openNewProduct() {
    setSelectedProduct(null)
    setEditorOpen(true)
    setImageFile(null)
    setError(null)
    setForm({
      ...emptyProductForm(),
      categoryId: String(categories[0]?.id ?? '')
    })
  }

  function openProductEditor(product: Product) {
    setSelectedProduct(product)
    setEditorOpen(true)
    setError(null)
  }

  function closeEditor() {
    setEditorOpen(false)
    setSelectedProduct(null)
    setImageFile(null)
    setError(null)
    setForm({
      ...emptyProductForm(),
      categoryId: String(categories[0]?.id ?? '')
    })
  }

  function openCategoryHome() {
    categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openProductsHome() {
    productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openNewCategory() {
    setSelectedCategory(null)
    setCategoryForm(emptyCategoryForm())
    setCategoryError(null)
    setCategorySuccess(null)
    setCategoryEditorOpen(true)
    setTimeout(() => categoryEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function openCategoryEditor(category: Category) {
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name,
      sortOrder: String(category.sort_order)
    })
    setCategoryError(null)
    setCategorySuccess(null)
    setCategoryEditorOpen(true)
    setTimeout(() => categoryEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function closeCategoryEditor() {
    setCategoryEditorOpen(false)
    setSelectedCategory(null)
    setCategoryForm(emptyCategoryForm())
    setCategoryError(null)
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = categoryForm.name.trim()
    if (!trimmedName) {
      setCategoryError('Escribe el nombre de la categoria')
      return
    }

    categoryMutation.mutate()
  }

  function handleDeleteCategory(category: Category) {
    const usageCount = products.filter((product) => product.category_id === category.id).length
    if (usageCount > 0) {
      setCategoryError('No se puede eliminar una categoria con productos asignados')
      return
    }

    if (window.confirm(`Eliminar la categoria "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id)
    }
  }

  function handleDeleteProduct(product: Product) {
    if (window.confirm(`Eliminar el producto "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  const visibleProducts = useMemo(() => {
    const sortedProducts = [...products].sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }))
    return activeCategoryFilter === 'all'
      ? sortedProducts
      : sortedProducts.filter((product) => product.category_id === activeCategoryFilter)
  }, [activeCategoryFilter, products])

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })),
    [categories]
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>()
    products.forEach((product) => {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1)
    })
    return counts
  }, [products])

  return (
    <section className="catalog-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Catalogo</p>
          <h2>Administracion del catalogo</h2>
          <p className="subtle">Entra por categorias o productos y mantiene cada bloque separado para operar sin ruido.</p>
        </div>
          <div className="catalog-actions">
            <span className="pill muted catalog-total">{sortedCategories.length} categorias</span>
            <span className="pill muted catalog-total">{products.length} productos</span>
          </div>
        </header>

      <section className="catalog-hub">
        <button type="button" className="home-card catalog-home-card" onClick={openCategoryHome}>
          <span className="home-card-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6h7l2 2h7v10H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M7 13h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 16h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="home-card-title">Categorias</span>
          <span className="home-card-description">Crear, editar y eliminar tipos de producto.</span>
        </button>

        <button type="button" className="home-card catalog-home-card" onClick={openProductsHome}>
          <span className="home-card-icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h14l2 4v12H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 4v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 11h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M9 15h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <span className="home-card-title">Productos</span>
          <span className="home-card-description">Agregar, modificar y borrar el catalogo operativo.</span>
        </button>
      </section>

      <section ref={categoriesRef} className="panel catalog-section">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Categorias</p>
            <h3>Tipos de producto</h3>
            <p className="subtle">Administra la estructura del menu antes de tocar los productos.</p>
          </div>
          <div className="editor-actions">
            <button type="button" className="ghost" onClick={openNewCategory}>
              Nueva categoria
            </button>
            <button type="button" className="ghost" onClick={openProductsHome}>
              Ir a productos
            </button>
          </div>
        </div>

        {productsQuery.isLoading || categoriesQuery.isLoading ? (
          <div className="panel">Cargando catalogo...</div>
        ) : (
          <div className="catalog-list">
            {sortedCategories.map((category) => {
              const count = categoryCounts.get(category.id) ?? 0
              return (
                <article key={category.id} className="panel category-card">
                  <div className="product-heading">
                    <div>
                      <p className="eyebrow">Orden {category.sort_order}</p>
                      <h3>{category.name}</h3>
                    </div>
                    <span className="pill muted">{count} productos</span>
                  </div>
                  <p className="product-description">Categoria disponible para agrupar productos dentro del menu.</p>
                  <div className="product-footer">
                    <span className="table-muted">{count > 0 ? 'Con productos asignados' : 'Lista para usar'}</span>
                    <div className="editor-actions">
                      <button type="button" className="ghost" onClick={() => openCategoryEditor(category)}>
                        Editar
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => handleDeleteCategory(category)}
                        disabled={count > 0 || deleteCategoryMutation.isPending}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}

            {!sortedCategories.length ? (
              <div className="panel empty-state">
                <h3>No hay categorias</h3>
                <p>Crea la primera categoria para comenzar a cargar productos.</p>
                <button type="button" className="primary" onClick={openNewCategory}>
                  Crear categoria
                </button>
              </div>
            ) : null}
          </div>
        )}

        <section ref={categoryEditorRef} className={categoryEditorOpen ? 'panel catalog-editor' : 'panel catalog-editor collapsed'}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">{selectedCategory ? 'Editar categoria' : 'Alta de categoria'}</p>
              <h3>{selectedCategory ? selectedCategory.name : 'Nueva categoria'}</h3>
            </div>
            <div className="editor-actions">
              {categoryEditorOpen ? (
                <button type="button" className="ghost" onClick={closeCategoryEditor}>
                  Cerrar
                </button>
              ) : null}
            </div>
          </div>

          {!categoryEditorOpen ? (
            <div className="empty-state">
              <h3>Editor de categorias</h3>
              <p>Selecciona una categoria para editarla o crea una nueva desde aqui.</p>
              <button type="button" className="primary" onClick={openNewCategory}>
                Abrir editor
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={handleCategorySubmit}>
              <div className="field-grid">
                <label className="field">
                  Nombre
                  <input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
                </label>

                <label className="field">
                  Orden
                  <input
                    type="number"
                    step="1"
                    value={categoryForm.sortOrder}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  />
                </label>
              </div>

              {categoryError ? <p className="error">{categoryError}</p> : null}
              {categorySuccess ? <p className="success-text">{categorySuccess}</p> : null}

              <div className="editor-actions">
                {selectedCategory ? (
                  <button
                    type="button"
                    className="ghost danger"
                    onClick={() => handleDeleteCategory(selectedCategory)}
                    disabled={deleteCategoryMutation.isPending}
                  >
                    Eliminar
                  </button>
                ) : null}
                <button type="submit" className="primary" disabled={categoryMutation.isPending || !categoryForm.name.trim()}>
                  {categoryMutation.isPending ? 'Guardando...' : selectedCategory ? 'Guardar cambios' : 'Crear categoria'}
                </button>
              </div>
            </form>
          )}
        </section>

        <section ref={productsRef} className="catalog-table-shell">
          <div className="panel-head catalog-products-head">
            <div>
              <p className="eyebrow">Productos</p>
              <h3>Listado editable</h3>
              <p className="subtle">Filtra por categoria, crea un producto o ajusta los existentes desde aqui.</p>
            </div>
            <div className="catalog-actions">
              <span className="pill muted catalog-total">{visibleProducts.length} productos</span>
              <label className="field catalog-filter">
                <span>Filtrar por tipo</span>
                <select
                  value={activeCategoryFilter === 'all' ? 'all' : String(activeCategoryFilter)}
                  onChange={(event) => setActiveCategoryFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                >
                  <option value="all">Todos los tipos</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {canEdit ? (
                <button type="button" className="primary new-product-button" onClick={openNewProduct}>
                  Nuevo producto
                </button>
              ) : null}
            </div>
          </div>

          {productsQuery.isLoading || categoriesQuery.isLoading ? (
            <div className="panel">Cargando catalogo...</div>
          ) : (
            <div className="table-wrap">
              <table className="catalog-table">
  <thead>
    <tr>
      <th>Nombre</th>
      <th>Detalle</th>
      <th>Editar</th>
    </tr>
  </thead>
  <tbody>
    {visibleProducts.map((product) => (
      <tr key={product.id}>
        <td>
          <div className="table-main-cell">
            <strong>{product.name}</strong>
            {product.image_url ? <span className="table-muted">Con foto</span> : <span className="table-muted">Sin foto</span>}
          </div>
        </td>
        <td>
          <div className="table-detail-stack">
            <span className="table-detail-line">
              <strong>Tipo:</strong> {product.category.name}
            </span>
            <span className="table-detail-line">{product.description || 'Sin descripcion'}</span>
            <span className="table-detail-line">
              <strong>Precio:</strong> ${product.price.toFixed(2)}
            </span>
            <span className="table-detail-line">
              <strong>Activo:</strong>{' '}
              <span className={product.is_active ? 'pill success' : 'pill muted'}>{product.is_active ? 'SI' : 'No'}</span>
            </span>
          </div>
        </td>
        <td>
          {canEdit ? (
            <div className="row-actions">
              <button type="button" className="ghost small" onClick={() => openProductEditor(product)}>
                Editar
              </button>
              <button type="button" className="ghost small danger" onClick={() => handleDeleteProduct(product)} disabled={deleteProductMutation.isPending}>
                Eliminar
              </button>
            </div>
          ) : (
            <span className="table-muted">Solo lectura</span>
          )}
        </td>
      </tr>
    ))}
  </tbody>
</table>
          </div>
        )}

        {!productsQuery.isLoading && visibleProducts.length === 0 ? (
          <div className="panel empty-state">
            <h3>No hay productos para mostrar</h3>
            <p>Revisa el filtro de tipo o crea un nuevo producto desde el boton superior.</p>
          </div>
        ) : null}
      </section>

      <section ref={editorRef} className={editorOpen ? 'panel catalog-editor' : 'panel catalog-editor collapsed'}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">{selectedProduct ? 'Editar producto' : 'Alta de producto'}</p>
            <h3>{selectedProduct ? selectedProduct.name : 'Nuevo producto'}</h3>
          </div>
          <div className="editor-actions">
            {canEdit && editorOpen ? (
              <button type="button" className="ghost" onClick={closeEditor}>
                Cerrar
              </button>
            ) : null}
          </div>
        </div>

        {!editorOpen ? (
          <div className="empty-state">
            <h3>Editor de producto</h3>
            <p>Selecciona un producto para ver sus detalles o usa el boton superior para crear uno nuevo.</p>
            {canEdit ? (
              <button type="button" className="primary" onClick={openNewProduct}>
                Abrir editor
              </button>
            ) : null}
          </div>
        ) : !canEdit ? (
          <p className="subtle">Tu usuario tiene acceso de solo lectura. El admin es quien puede agregar o modificar productos.</p>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              Nombre
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>

            <div className="field-grid">
              <label className="field">
                Categoria
                <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}>
                  <option value="">Selecciona una categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                Precio
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
              </label>
            </div>

            <label className="field">
              Descripcion
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              ></textarea>
            </label>

            <div className="field-grid">
              <label className="field">
                Orden
                <input
                  type="number"
                  step="1"
                  value={form.sortOrder}
                  onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
                />
              </label>

              <label className="field switch-row">
                <span>Activo</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
              </label>
            </div>

            <label className="field">
              Imagen
              <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
            </label>

            <div className="preview">
              {imagePreview ? <img src={imagePreview} alt={form.name || 'Vista previa del producto'} /> : <span>Sin imagen</span>}
            </div>

            {error ? <p className="error">{error}</p> : null}

            <button type="submit" className="primary" disabled={mutation.isPending || !form.categoryId}>
              {mutation.isPending ? 'Guardando...' : selectedProduct ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </form>
        )}
      </section>
      </section>
    </section>
  )
}

function OrderView({ token, user }: { token: string; user: UserOut }) {
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

function KitchenView({ token }: { token: string }) {
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

  const mutation = useMutation({
    mutationFn: ({ kind, id, status }: { kind: 'order' | 'delta'; id: number; status: WorkflowStatus }) =>
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

function UsersView({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const rolesQuery = useQuery({
    queryKey: ['roles', token],
    queryFn: () => fetchRoles(token)
  })
  const usersQuery = useQuery({
    queryKey: ['users', token],
    queryFn: () => fetchUsers(token)
  })

  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<UserFormState>(emptyUserForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const roles = rolesQuery.data ?? []
  const users = usersQuery.data?.items ?? []

  useEffect(() => {
    if (!selectedUser && !form.roleId && roles[0]) {
      setForm((current) => ({ ...current, roleId: String(roles[0].id) }))
    }
  }, [form.roleId, roles, selectedUser])

  useEffect(() => {
    if (selectedUser && editorOpen) {
      setForm({
        username: selectedUser.username,
        fullName: selectedUser.full_name,
        password: '',
        roleId: String(selectedUser.role.id),
        isActive: selectedUser.is_active
      })
    } else {
      setForm((current) => ({
        ...emptyUserForm(),
        roleId: current.roleId || String(roles[0]?.id ?? '')
      }))
    }
  }, [editorOpen, roles, selectedUser])

  const mutation = useMutation({
    mutationFn: () =>
      submitUser(token, selectedUser?.id ?? null, {
        username: form.username,
        full_name: form.fullName,
        role_id: Number(form.roleId),
        is_active: form.isActive,
        password: form.password ? form.password : undefined
      }),
    onSuccess: async () => {
      setError(null)
      setSuccess('Usuario guardado')
      setSelectedUser(null)
      setEditorOpen(false)
      setForm((current) => ({
        ...emptyUserForm(),
        roleId: current.roleId
      }))
      await queryClient.invalidateQueries({ queryKey: ['users', token] })
    },
    onError: () => {
      setSuccess(null)
      setError('No se pudo guardar el usuario')
    }
  })

  function openNewUser() {
    setSelectedUser(null)
    setEditorOpen(true)
    setError(null)
    setSuccess(null)
    setForm({
      ...emptyUserForm(),
      roleId: String(roles[0]?.id ?? '')
    })
  }

  function openUserEditor(userItem: UserAdmin) {
    setSelectedUser(userItem)
    setEditorOpen(true)
    setError(null)
    setSuccess(null)
  }

  function closeEditor() {
    setSelectedUser(null)
    setEditorOpen(false)
    setError(null)
    setSuccess(null)
    setForm({
      ...emptyUserForm(),
      roleId: String(roles[0]?.id ?? '')
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.roleId) {
      setError('Selecciona un rol')
      return
    }
    if (!selectedUser && !form.password) {
      setError('La contrasena es obligatoria al crear un usuario')
      return
    }
    mutation.mutate()
  }

  return (
    <section className="users-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h2>Administracion de meseros</h2>
          <p className="subtle">Crea y reasigna usuarios por mesero desde aqui. Cada cuenta queda ligada al restaurante.</p>
        </div>
        <div className="catalog-actions">
          <div className="health">
            <span className="dot ok" />
            <span>{users.length} usuarios</span>
          </div>
          <button type="button" className="ghost" onClick={openNewUser}>
            Nuevo usuario
          </button>
        </div>
      </header>

      <section className="catalog-list">
        {usersQuery.isLoading || rolesQuery.isLoading ? (
          <div className="panel">Cargando usuarios...</div>
        ) : (
          users.map((userItem) => (
            <article key={userItem.id} className="user-card panel">
              <div className="product-heading">
                <div>
                  <p className="eyebrow">{userItem.role.label}</p>
                  <h3>{userItem.full_name}</h3>
                </div>
                <span className={userItem.is_active ? 'pill success' : 'pill muted'}>{userItem.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
              <p className="product-description">
                @{userItem.username} - Restaurante #{userItem.restaurant_id}
              </p>
              <div className="product-footer">
                <strong>{userItem.role.code}</strong>
                <button type="button" className="ghost" onClick={() => openUserEditor(userItem)}>
                  Editar
                </button>
              </div>
            </article>
          ))
        )}

        {!usersQuery.isLoading && users.length === 0 ? (
          <div className="panel empty-state">
            <h3>No hay usuarios</h3>
            <p>Crea aqui las cuentas de los meseros que van a operar el POS.</p>
          </div>
        ) : null}
      </section>

      <section className={editorOpen ? 'panel catalog-editor' : 'panel catalog-editor collapsed'}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">{selectedUser ? 'Editar usuario' : 'Alta de usuario'}</p>
            <h3>{selectedUser ? selectedUser.full_name : 'Nuevo usuario'}</h3>
          </div>
          <div className="editor-actions">
            {editorOpen ? (
              <button type="button" className="ghost" onClick={closeEditor}>
                Cerrar
              </button>
            ) : null}
          </div>
        </div>

        {!editorOpen ? (
          <div className="empty-state">
            <h3>Editor de usuario</h3>
            <p>Abre el editor para crear o reasignar una cuenta a un mesero.</p>
            <button type="button" className="primary" onClick={openNewUser}>
              Abrir editor
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              Usuario
              <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
            </label>

            <label className="field">
              Nombre completo
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </label>

            <div className="field-grid">
              <label className="field">
                Rol
                <select value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))}>
                  <option value="">Selecciona un rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field switch-row">
                <span>Activo</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
              </label>
            </div>

            <label className="field">
              {selectedUser ? 'Nueva contrasena (opcional)' : 'Contrasena'}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={selectedUser ? 'Dejar en blanco para conservarla' : ''}
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}

            <button type="submit" className="primary" disabled={mutation.isPending || !form.roleId}>
              {mutation.isPending ? 'Guardando...' : selectedUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        )}
      </section>
    </section>
  )
}

function ConfigView({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['settings', token],
    queryFn: () => fetchSettings(token)
  })

  const [form, setForm] = useState<SettingsFormState>(emptySettingsForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const settings = settingsQuery.data?.item

  useEffect(() => {
    if (settings) {
      setForm({
        businessName: settings.business_name,
        currencyCode: settings.currency_code,
        taxRate: String(settings.tax_rate),
        receiptFooter: settings.receipt_footer ?? '',
        tableLabelSingular: settings.table_label_singular,
        tableLabelPlural: settings.table_label_plural
      })
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: () => submitSettings(token, form),
    onSuccess: async (result) => {
      setError(null)
      setSuccess('Configuracion guardada')
      setForm({
        businessName: result.item.business_name,
        currencyCode: result.item.currency_code,
        taxRate: String(result.item.tax_rate),
        receiptFooter: result.item.receipt_footer ?? '',
        tableLabelSingular: result.item.table_label_singular,
        tableLabelPlural: result.item.table_label_plural
      })
      queryClient.setQueryData(['settings', token], result)
      await queryClient.invalidateQueries({ queryKey: ['settings', token] })
      await queryClient.invalidateQueries({ queryKey: ['me', token] })
    },
    onError: () => {
      setSuccess(null)
      setError('No se pudo guardar la configuracion')
    }
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <section className="catalog-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h2>Nombre del restaurante y ajustes base</h2>
          <p className="subtle">Aqui cambias la identidad visible del negocio sin tocar el codigo.</p>
        </div>
        <div className="catalog-actions">
          <div className="health">
            <span className="dot ok" />
            <span>{settings?.business_name ?? 'Cargando'}</span>
          </div>
        </div>
      </header>

      <section className="panel config-panel">
        <form className="stack" onSubmit={handleSubmit}>
          <div className="field-grid">
            <label className="field">
              Nombre del negocio
              <input value={form.businessName} onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))} />
            </label>

            <label className="field">
              Moneda
              <input value={form.currencyCode} onChange={(event) => setForm((current) => ({ ...current, currencyCode: event.target.value.toUpperCase() }))} maxLength={3} />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              Tasa de impuesto
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.taxRate}
                onChange={(event) => setForm((current) => ({ ...current, taxRate: event.target.value }))}
              />
            </label>

            <label className="field">
              Pie de ticket
              <input
                value={form.receiptFooter}
                onChange={(event) => setForm((current) => ({ ...current, receiptFooter: event.target.value }))}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              Etiqueta singular
              <input
                value={form.tableLabelSingular}
                onChange={(event) => setForm((current) => ({ ...current, tableLabelSingular: event.target.value }))}
              />
            </label>

            <label className="field">
              Etiqueta plural
              <input
                value={form.tableLabelPlural}
                onChange={(event) => setForm((current) => ({ ...current, tableLabelPlural: event.target.value }))}
              />
            </label>
          </div>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success-text">{success}</p> : null}

          <button type="submit" className="primary" disabled={mutation.isPending || !form.businessName.trim()}>
            {mutation.isPending ? 'Guardando...' : 'Guardar configuracion'}
          </button>
        </form>
      </section>
    </section>
  )
}

type HomeTileKind = 'catalog' | 'orders' | 'users' | 'reports' | 'config'

function HomeTileIcon({ kind }: { kind: HomeTileKind }) {
  switch (kind) {
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

function AdminHomeView({
  businessName,
  onOpen,
  onLogout
}: {
  businessName: string
  onOpen: (view: 'catalog' | 'users' | 'orders' | 'reports' | 'config') => void
  onLogout: () => void
}) {
  const tiles: Array<{
    id: HomeTileKind
    title: string
    description: string
  }> = [
    {
      id: 'catalog',
      title: 'Catalogo',
      description: 'Productos, categorias e imagenes listos para editar.'
    },
    {
      id: 'orders',
      title: 'Pedidos',
      description: 'Tomar, revisar y enviar comandas desde el celular.'
    },
    {
      id: 'users',
      title: 'Usuarios',
      description: 'Crear cuentas para meseros y asignar roles.'
    },
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Corte, historial y visibilidad de operacion.'
    },
    {
      id: 'config',
      title: 'Configuracion',
      description: 'Cambiar el nombre del negocio y ajustes base.'
    }
  ]

  return (
    <section className="home-shell">
      <div className="home-hero">
        <h1>{businessName}</h1>
        <p className="home-subtitle">Panel Admin</p>
        <p className="home-copy">Acceso rapido a operacion, catalogo, usuarios, reportes y configuracion.</p>
      </div>

      <div className="home-grid">
        {tiles.map((tile) => (
          <button key={tile.id} type="button" className="home-card" onClick={() => onOpen(tile.id)}>
            <span className="home-card-icon">
              <HomeTileIcon kind={tile.id} />
            </span>
            <span className="home-card-title">{tile.title}</span>
            <span className="home-card-description">{tile.description}</span>
          </button>
        ))}
      </div>

      <div className="home-footer">
        <button type="button" className="ghost home-exit" onClick={onLogout}>
          SALIR
        </button>
        <p>Powered by Vasovoy</p>
      </div>
    </section>
  )
}

function ShellView({ user, logout }: { user: UserOut; logout: () => void }) {
  const token = useSessionStore((state) => state.token)
  const activeView = useUiStore((state) => state.activeView)
  const setActiveView = useUiStore((state) => state.setActiveView)
  const [menuOpen, setMenuOpen] = useState(false)
  const settingsQuery = useQuery({
    queryKey: ['settings', token],
    queryFn: () => fetchSettings(token ?? ''),
    enabled: user.role.code === 'admin' && Boolean(token)
  })

  const roleCode = user.role.code
  const allowedViews =
    roleCode === 'admin'
      ? (['home', 'catalog', 'users', 'orders', 'reports', 'config'] as const)
      : roleCode === 'waiter'
        ? (['orders'] as const)
        : (['kitchen'] as const)
  const primaryView = roleCode === 'admin' ? 'home' : roleCode === 'waiter' ? 'orders' : 'kitchen'
  const effectiveView = allowedViews.includes(activeView as (typeof allowedViews)[number]) ? activeView : primaryView
  const navigationItems = [
    allowedViews.includes('home') ? { id: 'home' as const, label: 'Inicio' } : null,
    allowedViews.includes('catalog') ? { id: 'catalog' as const, label: 'Catalogo' } : null,
    allowedViews.includes('users') ? { id: 'users' as const, label: 'Usuarios' } : null,
    allowedViews.includes('orders') ? { id: 'orders' as const, label: 'Pedidos' } : null,
    allowedViews.includes('kitchen') ? { id: 'kitchen' as const, label: 'Kitchen' } : null,
    allowedViews.includes('reports') ? { id: 'reports' as const, label: 'Corte' } : null,
    allowedViews.includes('config') ? { id: 'config' as const, label: 'Configuracion' } : null
  ].filter((item): item is { id: (typeof allowedViews)[number]; label: string } => item !== null)

  useEffect(() => {
    if (!allowedViews.includes(activeView as (typeof allowedViews)[number])) {
      setActiveView(primaryView)
    }
  }, [activeView, allowedViews, primaryView, setActiveView])

  useEffect(() => {
    setMenuOpen(false)
  }, [effectiveView])

  function goToView(view: (typeof allowedViews)[number]) {
    setActiveView(view)
    setMenuOpen(false)
  }

  const showBackButton = roleCode === 'admin' && effectiveView !== 'home'
  const shellTitle = roleCode === 'admin' ? 'Panel Admin' : 'Base de operacion'
  const headerSubtitle =
    roleCode === 'admin'
      ? `Restaurante #${user.restaurant_id}`
      : `${user.full_name} - ${user.role.label} - Restaurante #${user.restaurant_id}`
  const businessName = settingsQuery.data?.item.business_name ?? 'Restaurante'

  return (
    <main className="shell">
      <header className="topbar">
        <div className="topbar-leading">
          <button type="button" className="ghost menu-button" onClick={() => setMenuOpen(true)} aria-label="Abrir navegacion">
            <span className="menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
          <div className="topbar-copy">
            <p className="eyebrow">POS Restaurante</p>
            <h1>{shellTitle}</h1>
            <p className="subtle">{headerSubtitle}</p>
          </div>
        </div>
        <div className="topbar-actions">
          {showBackButton ? (
            <button type="button" className="ghost back-button" onClick={() => goToView('home')} aria-label="Regresar a inicio">
              <svg className="back-arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14.5 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Regresar</span>
            </button>
          ) : null}
          {effectiveView === 'catalog' ? null : (
            <button type="button" className="ghost" onClick={logout}>
              Salir
            </button>
          )}
        </div>
      </header>

      {roleCode !== 'admin' ? (
        <nav className="tabs desktop-tabs" aria-label="Navegacion principal">
          {navigationItems.map((item) => (
            <button key={item.id} type="button" className={effectiveView === item.id ? 'tab active' : 'tab'} onClick={() => goToView(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      <div className={menuOpen ? 'nav-backdrop open' : 'nav-backdrop'} onClick={() => setMenuOpen(false)} />

      <aside className={menuOpen ? 'nav-drawer open' : 'nav-drawer'} aria-label="Menu de secciones">
        <div className="nav-drawer-head">
          <div>
            <p className="eyebrow">Secciones</p>
            <h2>Menu rapido</h2>
          </div>
          <button type="button" className="ghost small" onClick={() => setMenuOpen(false)}>
            Cerrar
          </button>
        </div>

        <div className="nav-drawer-list">
          {navigationItems.map((item) => (
            <button key={item.id} type="button" className={effectiveView === item.id ? 'drawer-item active' : 'drawer-item'} onClick={() => goToView(item.id)}>
              <span>{item.label}</span>
              <span className="drawer-item-hint">Abrir</span>
            </button>
          ))}
        </div>

        <button type="button" className="drawer-item danger" onClick={logout}>
          Salir
        </button>
      </aside>

      {effectiveView === 'home' && roleCode === 'admin' ? (
        <AdminHomeView businessName={businessName} onOpen={(view) => goToView(view)} onLogout={logout} />
      ) : null}
      {effectiveView === 'config' && roleCode === 'admin' && token ? <ConfigView token={token} /> : null}
      {effectiveView === 'catalog' && token ? <CatalogView token={token} user={user} /> : null}
      {effectiveView === 'users' && token ? <UsersView token={token} /> : null}
      {effectiveView === 'orders' && token ? <OrderView token={token} user={user} /> : null}
      {effectiveView === 'kitchen' && token ? <KitchenView token={token} /> : null}
      {effectiveView === 'reports' && roleCode === 'admin' ? (
        <section className="grid">
          <article className="panel">
            <h2>Corte</h2>
            <p>Resumen listo para controlar ventas, cierres y seguimiento operativo.</p>
          </article>
        </section>
      ) : null}
    </main>
  )
}

export function App() {
  const token = useSessionStore((state) => state.token)
  const hydrated = useSessionStore((state) => state.hydrated)
  const hydrate = useSessionStore((state) => state.hydrate)
  const logout = useSessionStore((state) => state.logout)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const meQuery = useQuery({
    queryKey: ['me', token],
    queryFn: () => fetchMe(token ?? ''),
    enabled: Boolean(token)
  })

  if (!hydrated) {
    return (
      <main className="shell">
        <div className="panel">Cargando sesion...</div>
      </main>
    )
  }

  if (!token) {
    return <LoginView />
  }

  if (meQuery.isLoading) {
    return (
      <main className="shell">
        <div className="panel">Verificando permisos...</div>
      </main>
    )
  }

  if (meQuery.isError || !meQuery.data) {
    return (
      <main className="shell">
        <div className="panel">
          <p>La sesion expiro o ya no es valida.</p>
          <button type="button" className="primary" onClick={logout}>
            Volver a iniciar
          </button>
        </div>
      </main>
    )
  }

  return <ShellView user={meQuery.data} logout={logout} />
}



