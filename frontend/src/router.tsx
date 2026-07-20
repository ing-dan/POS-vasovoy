import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './layouts/AppShell'
import { ProtectedRoute } from './layouts/ProtectedRoute'
import { homePathForRole } from './layouts/navConfig'
import { AdminHome } from './features/home/AdminHome'
import { CatalogView } from './features/catalog/CatalogView'
import { OrderView } from './features/orders/OrderView'
import { KitchenView } from './features/kitchen/KitchenView'
import { UsersView } from './features/users/UsersView'
import { ConfigView } from './features/settings/ConfigView'
import { ReportsView } from './features/reports/ReportsView'
import type { UserOut } from './types/auth'

export function AppRoutes({ user, token, logout }: { user: UserOut; token: string; logout: () => void }) {
  const roleCode = user.role.code

  return (
    <Routes>
      <Route path="/app" element={<AppShell user={user} logout={logout} />}>
        <Route
          index
          element={
            roleCode === 'admin' ? (
              <AdminHome />
            ) : (
              <Navigate to={homePathForRole(roleCode)} replace />
            )
          }
        />
        <Route
          path="pedidos"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin', 'waiter']}>
              <OrderView token={token} user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="cocina"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin', 'kitchen']}>
              <KitchenView token={token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="catalogo"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <CatalogView token={token} user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="usuarios"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <UsersView token={token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="reportes"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <ReportsView token={token} />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracion"
          element={
            <ProtectedRoute user={user} allowedRoles={['admin']}>
              <ConfigView token={token} />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={homePathForRole(roleCode)} replace />} />
    </Routes>
  )
}
