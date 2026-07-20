import type { Role } from './auth'

export type UserAdmin = {
  id: number
  username: string
  full_name: string
  restaurant_id: number
  is_active: boolean
  role: Role
}

export type UserFormState = {
  username: string
  fullName: string
  password: string
  roleId: string
  isActive: boolean
}

export const emptyUserForm = (): UserFormState => ({
  username: '',
  fullName: '',
  password: '',
  roleId: '',
  isActive: true
})
