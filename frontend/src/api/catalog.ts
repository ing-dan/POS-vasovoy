import { apiJson } from '../lib/http'
import type { ListResponse } from '../types/common'
import type { Category, CategoryFormState, Product, ProductFormState } from '../types/catalog'

export async function fetchCategories(token: string) {
  return apiJson<ListResponse<Category>>('/catalog/categories', token)
}

export async function createCategory(token: string, name: string, sortOrder?: number) {
  return apiJson<{ item: Category }>('/catalog/categories', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      sort_order: sortOrder
    })
  })
}

export async function updateCategory(token: string, categoryId: number, form: CategoryFormState) {
  return apiJson<{ item: Category }>(`/catalog/categories/${categoryId}`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: form.name.trim(),
      sort_order: Number(form.sortOrder)
    })
  })
}

export async function deleteCategory(token: string, categoryId: number) {
  return apiJson<{ ok: boolean }>(`/catalog/categories/${categoryId}`, token, {
    method: 'DELETE'
  })
}

export async function fetchProducts(token: string) {
  return apiJson<ListResponse<Product>>('/catalog/products', token)
}

export async function deleteProduct(token: string, productId: number) {
  return apiJson<{ ok: boolean }>(`/catalog/products/${productId}`, token, {
    method: 'DELETE'
  })
}

export async function submitProduct(token: string, productId: number | null, form: ProductFormState, imageFile: File | null) {
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
