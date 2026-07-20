import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createCategory,
  deleteCategory,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  submitProduct,
  updateCategory
} from '../../api/catalog'
import type { UserOut } from '../../types/auth'
import { emptyCategoryForm, emptyProductForm } from '../../types/catalog'
import type { Category, CategoryFormState, Product, ProductFormState } from '../../types/catalog'

type CatalogMode = 'home' | 'categories' | 'products' | 'category-form' | 'product-form'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  }).format(value)
}

function BackButton({ onClick, label = 'Regresar' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="ghost catalog-back-button" onClick={onClick}>
      <svg className="back-arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{label}</span>
    </button>
  )
}

function CatalogHeroCard({
  title,
  description,
  hint,
  onClick
}: {
  title: string
  description: string
  hint: string
  onClick: () => void
}) {
  return (
    <button type="button" className="catalog-entry-card" onClick={onClick}>
      <span className="catalog-entry-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h8l2 2h6v10H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 13h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7 16h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="catalog-entry-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="catalog-entry-hint">{hint}</span>
    </button>
  )
}

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

  const [mode, setMode] = useState<CatalogMode>('home')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm)
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [productError, setProductError] = useState<string | null>(null)
  const [categorySuccess, setCategorySuccess] = useState<string | null>(null)
  const [productSuccess, setProductSuccess] = useState<string | null>(null)
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all'>('all')

  const categoryFormRef = useRef<HTMLElement | null>(null)
  const productFormRef = useRef<HTMLElement | null>(null)

  const categories = categoriesQuery.data?.items ?? []
  const products = productsQuery.data?.items ?? []

  useEffect(() => {
    if (!selectedProduct && !productForm.categoryId && categories[0]) {
      setProductForm((current) => ({ ...current, categoryId: String(categories[0].id) }))
    }
  }, [categories, productForm.categoryId, selectedProduct])

  useEffect(() => {
    if (selectedProduct) {
      setProductForm({
        name: selectedProduct.name,
        categoryId: String(selectedProduct.category_id),
        price: String(selectedProduct.price),
        description: selectedProduct.description ?? '',
        sortOrder: String(selectedProduct.sort_order),
        isActive: selectedProduct.is_active
      })
      setImageFile(null)
    } else {
      setProductForm((current) => ({
        ...emptyProductForm(),
        categoryId: current.categoryId || String(categories[0]?.id ?? '')
      }))
      setImageFile(null)
    }
  }, [categories, selectedProduct])

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
    if (mode === 'category-form') {
      categoryFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'product-form') {
      productFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [mode])

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })),
    [categories]
  )

  const sortedProducts = useMemo(
    () => [...products].sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' })),
    [products]
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>()
    products.forEach((product) => {
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1)
    })
    return counts
  }, [products])

  const visibleProducts = useMemo(() => {
    return filterCategoryId === 'all' ? sortedProducts : sortedProducts.filter((product) => product.category_id === filterCategoryId)
  }, [filterCategoryId, sortedProducts])

  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])
  const selectedFilterCategory = filterCategoryId === 'all' ? null : categoriesById.get(filterCategoryId) ?? null

  const categoryMutation = useMutation({
    mutationFn: () =>
      selectedCategory
        ? updateCategory(token, selectedCategory.id, categoryForm)
        : createCategory(token, categoryForm.name, Number(categoryForm.sortOrder)),
    onSuccess: async () => {
      setCategoryError(null)
      setCategorySuccess('Categoría guardada')
      setSelectedCategory(null)
      setCategoryForm(emptyCategoryForm())
      setMode('categories')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', token] }),
        queryClient.invalidateQueries({ queryKey: ['products', token] })
      ])
    },
    onError: () => {
      setCategorySuccess(null)
      setCategoryError('No se pudo guardar la categoría')
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) => deleteCategory(token, categoryId),
    onSuccess: async () => {
      setCategoryError(null)
      setCategorySuccess('Categoría eliminada')
      setSelectedCategory(null)
      setCategoryForm(emptyCategoryForm())
      setMode('categories')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['categories', token] }),
        queryClient.invalidateQueries({ queryKey: ['products', token] })
      ])
    },
    onError: (err) => {
      setCategorySuccess(null)
      setCategoryError(err instanceof Error ? err.message : 'No se pudo eliminar la categoría')
    }
  })

  const productMutation = useMutation({
    mutationFn: () => submitProduct(token, selectedProduct?.id ?? null, productForm, imageFile),
    onSuccess: async () => {
      setProductError(null)
      setProductSuccess('Producto guardado')
      setSelectedProduct(null)
      setProductForm(emptyProductForm())
      setImageFile(null)
      setMode('products')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', token] }),
        queryClient.invalidateQueries({ queryKey: ['categories', token] })
      ])
    },
    onError: () => {
      setProductSuccess(null)
      setProductError('No se pudo guardar el producto')
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: (productId: number) => deleteProduct(token, productId),
    onSuccess: async () => {
      setProductError(null)
      setSelectedProduct(null)
      setProductForm(emptyProductForm())
      setImageFile(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products', token] }),
        queryClient.invalidateQueries({ queryKey: ['categories', token] })
      ])
    },
    onError: (err) => {
      setProductError(err instanceof Error ? err.message : 'No se pudo eliminar el producto')
    }
  })

  function openCategoryList() {
    setMode('categories')
  }

  function openProductList() {
    setMode('products')
  }

  function openNewCategory() {
    setSelectedCategory(null)
    setCategoryForm(emptyCategoryForm())
    setCategoryError(null)
    setCategorySuccess(null)
    setMode('category-form')
  }

  function openEditCategory(category: Category) {
    setSelectedCategory(category)
    setCategoryForm({
      name: category.name,
      sortOrder: String(category.sort_order)
    })
    setCategoryError(null)
    setCategorySuccess(null)
    setMode('category-form')
  }

  function openNewProduct() {
    setSelectedProduct(null)
    setProductForm({
      ...emptyProductForm(),
      categoryId: String(categories[0]?.id ?? '')
    })
    setImageFile(null)
    setProductError(null)
    setProductSuccess(null)
    setMode('product-form')
  }

  function openEditProduct(product: Product) {
    setSelectedProduct(product)
    setProductError(null)
    setProductSuccess(null)
    setMode('product-form')
  }

  function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = categoryForm.name.trim()
    if (!trimmedName) {
      setCategoryError('Escribe el nombre de la categoría')
      return
    }

    categoryMutation.mutate()
  }

  function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!productForm.categoryId) {
      setProductError('Selecciona una categoría')
      return
    }

    productMutation.mutate()
  }

  function handleDeleteCategory(category: Category) {
    const usageCount = products.filter((product) => product.category_id === category.id).length
    if (usageCount > 0) {
      setCategoryError('No se puede eliminar una categoría con productos asignados')
      return
    }

    if (window.confirm(`Eliminar la categoría "${category.name}"?`)) {
      deleteCategoryMutation.mutate(category.id)
    }
  }

  function handleDeleteProduct(product: Product) {
    if (window.confirm(`Eliminar el producto "${product.name}"?`)) {
      deleteProductMutation.mutate(product.id)
    }
  }

  const totalActiveProducts = products.filter((product) => product.is_active).length

  if (mode === 'home') {
    return (
      <section className="catalog-shell">
        <header className="catalog-header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Centro de administración del menú</h2>
            <p className="subtle">Elige qué deseas gestionar. Cada área te lleva a una tabla clara con sus acciones y formularios dedicados.</p>
          </div>
          <div className="catalog-actions">
            <span className="pill muted catalog-total">{sortedCategories.length} categorías</span>
            <span className="pill muted catalog-total">{products.length} productos</span>
          </div>
        </header>

        <section className="catalog-home-grid">
          <CatalogHeroCard
            title="Categorías"
            description="Organiza los tipos de producto y administra su estructura."
            hint="Abrir tabla"
            onClick={openCategoryList}
          />
          <CatalogHeroCard
            title="Productos"
            description="Consulta, edita y carga productos con imágenes."
            hint="Abrir tabla"
            onClick={openProductList}
          />
        </section>
      </section>
    )
  }

  if (mode === 'categories') {
    return (
      <section className="catalog-shell">
        <header className="catalog-header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Categorías</h2>
            <p className="subtle">Aquí ves todas las categorías registradas, puedes editarlas, eliminarlas o crear una nueva.</p>
          </div>
          <div className="catalog-actions">
            <BackButton onClick={() => setMode('home')} />
            {canEdit ? (
              <button type="button" className="primary new-product-button" onClick={openNewCategory}>
                Nueva categoría
              </button>
            ) : null}
          </div>
        </header>

        <section className="panel catalog-table-panel">
          {categoriesQuery.isLoading ? (
            <div className="empty-state">
              <h3>Cargando categorías...</h3>
              <p>Estamos sincronizando la información del catálogo.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Orden</th>
                    <th>Productos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((category) => {
                    const count = categoryCounts.get(category.id) ?? 0
                    return (
                      <tr key={category.id}>
                        <td>
                          <strong>{category.name}</strong>
                        </td>
                        <td>{category.sort_order}</td>
                        <td>{count}</td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="ghost small" onClick={() => openEditCategory(category)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              className="ghost small danger"
                              onClick={() => handleDeleteCategory(category)}
                              disabled={count > 0 || deleteCategoryMutation.isPending}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!categoriesQuery.isLoading && !sortedCategories.length ? (
            <div className="empty-state catalog-empty">
              <h3>No hay categorías registradas</h3>
              <p>Agrega la primera categoría para iniciar el catálogo.</p>
            </div>
          ) : null}
        </section>

        <section ref={categoryFormRef} className={mode === 'category-form' ? 'panel catalog-form-panel open' : 'panel catalog-form-panel'}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">{selectedCategory ? 'Editar categoría' : 'Nueva categoría'}</p>
              <h3>{selectedCategory ? selectedCategory.name : 'Alta de categoría'}</h3>
            </div>
            {mode === 'category-form' ? <BackButton onClick={() => setMode('categories')} /> : null}
          </div>

          {mode !== 'category-form' ? (
            <div className="empty-state">
              <h3>Formulario de categoría</h3>
              <p>Aquí capturas o modificas una categoría sin distraer la tabla principal.</p>
              <button type="button" className="primary" onClick={openNewCategory}>
                Abrir formulario
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={handleCategorySubmit}>
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
                  {categoryMutation.isPending ? 'Guardando...' : selectedCategory ? 'Guardar cambios' : 'Crear categoría'}
                </button>
              </div>
            </form>
          )}
        </section>
      </section>
    )
  }

  if (mode === 'products') {
    return (
      <section className="catalog-shell">
        <header className="catalog-header">
          <div>
            <p className="eyebrow">Catálogo</p>
            <h2>Productos</h2>
            <p className="subtle">Consulta el catálogo en tabla, filtra por categoría y entra al formulario sólo cuando quieras editar o dar de alta.</p>
          </div>
          <div className="catalog-actions">
            <BackButton onClick={() => setMode('home')} />
            {canEdit ? (
              <button type="button" className="primary new-product-button" onClick={openNewProduct}>
                Nuevo producto
              </button>
            ) : null}
          </div>
        </header>

        <section className="catalog-toolbar-panel">
          <div className="toolbar-block">
            <span className="toolbar-label">Total visible</span>
            <span className="pill muted catalog-total">{visibleProducts.length} productos</span>
          </div>

          <div className="toolbar-block">
            <label className="field catalog-filter">
              <span>Filtrar por categoría</span>
              <select
                value={filterCategoryId === 'all' ? 'all' : String(filterCategoryId)}
                onChange={(event) => setFilterCategoryId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
              >
                <option value="all">Todas las categorías</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="toolbar-block">
            <span className="toolbar-label">Contexto</span>
            <div className="filter-pills">
              <span className="pill muted">{filterCategoryId === 'all' ? 'Sin filtro' : selectedFilterCategory?.name ?? 'Sin categoría'}</span>
              <span className="pill muted">{totalActiveProducts} activos</span>
            </div>
          </div>
        </section>

        <section className="panel catalog-table-panel">
          {productsQuery.isLoading ? (
            <div className="empty-state">
              <h3>Cargando productos...</h3>
              <p>Estamos sincronizando los productos registrados.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Activo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="table-main-cell">
                          <strong>{product.name}</strong>
                          <span className="table-muted">{product.image_url ? 'Con foto' : 'Sin foto'}</span>
                        </div>
                      </td>
                      <td>{product.category.name}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>
                        <span className={product.is_active ? 'pill success' : 'pill warning'}>{product.is_active ? 'Sí' : 'No'}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="ghost small" onClick={() => openEditProduct(product)}>
                            Editar
                          </button>
                          <button type="button" className="ghost small danger" onClick={() => handleDeleteProduct(product)} disabled={deleteProductMutation.isPending}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!productsQuery.isLoading && !visibleProducts.length ? (
            <div className="empty-state catalog-empty">
              <h3>No hay productos para mostrar</h3>
              <p>Prueba con otro filtro o crea un nuevo producto.</p>
            </div>
          ) : null}
        </section>

        <section ref={productFormRef} className={mode === 'product-form' ? 'panel catalog-form-panel open' : 'panel catalog-form-panel'}>
          <div className="panel-head">
            <div>
              <p className="eyebrow">{selectedProduct ? 'Editar producto' : 'Nuevo producto'}</p>
              <h3>{selectedProduct ? selectedProduct.name : 'Alta de producto'}</h3>
            </div>
            {mode === 'product-form' ? <BackButton onClick={() => setMode('products')} /> : null}
          </div>

          {mode !== 'product-form' ? (
            <div className="empty-state">
              <h3>Formulario de producto</h3>
              <p>Se abre sólo cuando quieres registrar o modificar un producto, para mantener la tabla limpia.</p>
              {canEdit ? (
                <button type="button" className="primary" onClick={openNewProduct}>
                  Abrir formulario
                </button>
              ) : null}
            </div>
          ) : !canEdit ? (
            <p className="subtle">Tu usuario tiene acceso de solo lectura. El administrador puede modificar productos.</p>
          ) : (
            <div className="editor-grid">
              <form className="stack" onSubmit={handleProductSubmit}>
                <label className="field">
                  Nombre
                  <input value={productForm.name} onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} />
                </label>

                <div className="field-grid">
                  <label className="field">
                    Categoría
                    <select value={productForm.categoryId} onChange={(event) => setProductForm((current) => ({ ...current, categoryId: event.target.value }))}>
                      <option value="">Selecciona una categoría</option>
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
                      value={productForm.price}
                      onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                    />
                  </label>
                </div>

                <label className="field">
                  Descripción
                  <textarea rows={4} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}></textarea>
                </label>

                <div className="field-grid">
                  <label className="field">
                    Orden
                    <input
                      type="number"
                      step="1"
                      value={productForm.sortOrder}
                      onChange={(event) => setProductForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </label>

                  <label className="field switch-row">
                    <span>Activo</span>
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(event) => setProductForm((current) => ({ ...current, isActive: event.target.checked }))}
                    />
                  </label>
                </div>

                <label className="field">
                  Imagen
                  <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
                </label>

                {productError ? <p className="error">{productError}</p> : null}
                {productSuccess ? <p className="success-text">{productSuccess}</p> : null}

                <div className="editor-actions">
                  {selectedProduct ? (
                    <button type="button" className="ghost danger" onClick={() => handleDeleteProduct(selectedProduct)} disabled={deleteProductMutation.isPending}>
                      Eliminar
                    </button>
                  ) : null}
                  <button type="submit" className="primary" disabled={productMutation.isPending || !productForm.categoryId}>
                    {productMutation.isPending ? 'Guardando...' : selectedProduct ? 'Guardar cambios' : 'Crear producto'}
                  </button>
                </div>
              </form>

              <aside className="editor-side">
                <div className="preview">
                  {imagePreview ? <img src={imagePreview} alt={productForm.name || 'Vista previa del producto'} /> : <span>Sin imagen</span>}
                </div>

                <div className="editor-hint">
                  <p className="eyebrow">Guía</p>
                  <h4>Captura ordenada</h4>
                  <p className="table-muted">
                    {selectedProduct
                      ? 'Ajusta los datos y guarda para actualizar la tabla.'
                      : 'Completa los campos y revisa la imagen antes de crear el producto.'}
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>
      </section>
    )
  }

  return null
}
