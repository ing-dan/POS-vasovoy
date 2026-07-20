import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { loginRequest } from '../../api/auth'
import { useSessionStore } from '../../store/session'

export function LoginView() {
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
