import { Navigate } from 'react-router-dom'

import type { UserOut } from '../types/auth'
import { homePathForRole } from './navConfig'

export function ProtectedRoute({
  user,
  allowedRoles,
  children
}: {
  user: UserOut
  allowedRoles: string[]
  children: React.ReactNode
}) {
  if (!allowedRoles.includes(user.role.code)) {
    // El usuario navego (o tenia guardada) una ruta que su rol no puede ver.
    // En vez de una pantalla en blanco o un error, lo regresamos a su
    // pantalla principal.
    return <Navigate to={homePathForRole(user.role.code)} replace />
  }

  return <>{children}</>
}
