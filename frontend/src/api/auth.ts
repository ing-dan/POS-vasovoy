import { apiJson } from '../lib/http'
import type { LoginResponse, Role, UserOut } from '../types/auth'

export async function loginRequest(username: string, password: string) {
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

export async function fetchMe(token: string) {
  return apiJson<UserOut>('/auth/me', token)
}

export async function fetchRoles(token: string) {
  return apiJson<Role[]>('/auth/roles', token)
}
