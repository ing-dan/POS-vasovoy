import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createCategory, deleteCategory, deleteProduct, fetchCategories, fetchProducts, submitProduct, updateCategory } from '../../api/catalog'
import type { UserOut } from '../../types/auth'
import { emptyCategoryForm, emptyProductForm } from '../../types/catalog'
import type { Category, CategoryFormState, Product, ProductFormState } from '../../types/catalog'

export function CatalogView({ token, user }: { token: string; user: UserOut }) {
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
