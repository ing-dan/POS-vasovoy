export type Category = {
  id: number
  name: string
  sort_order: number
}

export type CategoryFormState = {
  name: string
  sortOrder: string
}

export type Product = {
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

export type ProductFormState = {
  name: string
  categoryId: string
  price: string
  description: string
  sortOrder: string
  isActive: boolean
}

export const emptyProductForm = (): ProductFormState => ({
  name: '',
  categoryId: '',
  price: '',
  description: '',
  sortOrder: '0',
  isActive: true
})

export const emptyCategoryForm = (): CategoryFormState => ({
  name: '',
  sortOrder: '0'
})
