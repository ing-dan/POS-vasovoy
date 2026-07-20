export async function apiJson<T>(path: string, token?: string, init?: RequestInit) {
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

export async function fetchHealth() {
  return apiJson<{ status: string }>('/health')
}
