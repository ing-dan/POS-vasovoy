import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { fetchMe } from './api/auth'
import { useSessionStore } from './store/session'
import { LoginView } from './features/auth/LoginView'
import { AppRoutes } from './router'

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/app" replace /> : <LoginView />} />
        <Route
          path="/*"
          element={
            !token ? (
              <Navigate to="/login" replace />
            ) : meQuery.isLoading ? (
              <main className="shell">
                <div className="panel">Verificando permisos...</div>
              </main>
            ) : meQuery.isError || !meQuery.data ? (
              <main className="shell">
                <div className="panel">
                  <p>La sesion expiro o ya no es valida.</p>
                  <button type="button" className="primary" onClick={logout}>
                    Volver a iniciar
                  </button>
                </div>
              </main>
            ) : (
              <AppRoutes user={meQuery.data} token={token} logout={logout} />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
