import { apiJson } from '../lib/http'
import type { ListResponse } from '../types/common'
import type { UserAdmin } from '../types/users'

export async function fetchUsers(token: string) {
  return apiJson<ListResponse<UserAdmin>>('/users', token)
}

export async function submitUser(
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
