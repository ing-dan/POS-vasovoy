import { FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchRoles } from '../../api/auth'
import { fetchUsers, submitUser } from '../../api/users'
import { emptyUserForm } from '../../types/users'
import type { UserAdmin, UserFormState } from '../../types/users'

export function UsersView({ token }: { token: string }) {
  const queryClient = useQueryClient()
  const rolesQuery = useQuery({
    queryKey: ['roles', token],
    queryFn: () => fetchRoles(token)
  })
  const usersQuery = useQuery({
    queryKey: ['users', token],
    queryFn: () => fetchUsers(token)
  })

  const [selectedUser, setSelectedUser] = useState<UserAdmin | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<UserFormState>(emptyUserForm)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const roles = rolesQuery.data ?? []
  const users = usersQuery.data?.items ?? []

  useEffect(() => {
    if (!selectedUser && !form.roleId && roles[0]) {
      setForm((current) => ({ ...current, roleId: String(roles[0].id) }))
    }
  }, [form.roleId, roles, selectedUser])

  useEffect(() => {
    if (selectedUser && editorOpen) {
      setForm({
        username: selectedUser.username,
        fullName: selectedUser.full_name,
        password: '',
        roleId: String(selectedUser.role.id),
        isActive: selectedUser.is_active
      })
    } else {
      setForm((current) => ({
        ...emptyUserForm(),
        roleId: current.roleId || String(roles[0]?.id ?? '')
      }))
    }
  }, [editorOpen, roles, selectedUser])

  const mutation = useMutation({
    mutationFn: () =>
      submitUser(token, selectedUser?.id ?? null, {
        username: form.username,
        full_name: form.fullName,
        role_id: Number(form.roleId),
        is_active: form.isActive,
        password: form.password ? form.password : undefined
      }),
    onSuccess: async () => {
      setError(null)
      setSuccess('Usuario guardado')
      setSelectedUser(null)
      setEditorOpen(false)
      setForm((current) => ({
        ...emptyUserForm(),
        roleId: current.roleId
      }))
      await queryClient.invalidateQueries({ queryKey: ['users', token] })
    },
    onError: () => {
      setSuccess(null)
      setError('No se pudo guardar el usuario')
    }
  })

  function openNewUser() {
    setSelectedUser(null)
    setEditorOpen(true)
    setError(null)
    setSuccess(null)
    setForm({
      ...emptyUserForm(),
      roleId: String(roles[0]?.id ?? '')
    })
  }

  function openUserEditor(userItem: UserAdmin) {
    setSelectedUser(userItem)
    setEditorOpen(true)
    setError(null)
    setSuccess(null)
  }

  function closeEditor() {
    setSelectedUser(null)
    setEditorOpen(false)
    setError(null)
    setSuccess(null)
    setForm({
      ...emptyUserForm(),
      roleId: String(roles[0]?.id ?? '')
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.roleId) {
      setError('Selecciona un rol')
      return
    }
    if (!selectedUser && !form.password) {
      setError('La contrasena es obligatoria al crear un usuario')
      return
    }
    mutation.mutate()
  }

  return (
    <section className="users-shell">
      <header className="catalog-header">
        <div>
          <p className="eyebrow">Usuarios</p>
          <h2>Administracion de meseros</h2>
          <p className="subtle">Crea y reasigna usuarios por mesero desde aqui. Cada cuenta queda ligada al restaurante.</p>
        </div>
        <div className="catalog-actions">
          <div className="health">
            <span className="dot ok" />
            <span>{users.length} usuarios</span>
          </div>
          <button type="button" className="ghost" onClick={openNewUser}>
            Nuevo usuario
          </button>
        </div>
      </header>

      <section className="catalog-list">
        {usersQuery.isLoading || rolesQuery.isLoading ? (
          <div className="panel">Cargando usuarios...</div>
        ) : (
          users.map((userItem) => (
            <article key={userItem.id} className="user-card panel">
              <div className="product-heading">
                <div>
                  <p className="eyebrow">{userItem.role.label}</p>
                  <h3>{userItem.full_name}</h3>
                </div>
                <span className={userItem.is_active ? 'pill success' : 'pill muted'}>{userItem.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
              <p className="product-description">
                @{userItem.username} - Restaurante #{userItem.restaurant_id}
              </p>
              <div className="product-footer">
                <strong>{userItem.role.code}</strong>
                <button type="button" className="ghost" onClick={() => openUserEditor(userItem)}>
                  Editar
                </button>
              </div>
            </article>
          ))
        )}

        {!usersQuery.isLoading && users.length === 0 ? (
          <div className="panel empty-state">
            <h3>No hay usuarios</h3>
            <p>Crea aqui las cuentas de los meseros que van a operar el POS.</p>
          </div>
        ) : null}
      </section>

      <section className={editorOpen ? 'panel catalog-editor' : 'panel catalog-editor collapsed'}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">{selectedUser ? 'Editar usuario' : 'Alta de usuario'}</p>
            <h3>{selectedUser ? selectedUser.full_name : 'Nuevo usuario'}</h3>
          </div>
          <div className="editor-actions">
            {editorOpen ? (
              <button type="button" className="ghost" onClick={closeEditor}>
                Cerrar
              </button>
            ) : null}
          </div>
        </div>

        {!editorOpen ? (
          <div className="empty-state">
            <h3>Editor de usuario</h3>
            <p>Abre el editor para crear o reasignar una cuenta a un mesero.</p>
            <button type="button" className="primary" onClick={openNewUser}>
              Abrir editor
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              Usuario
              <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
            </label>

            <label className="field">
              Nombre completo
              <input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} />
            </label>

            <div className="field-grid">
              <label className="field">
                Rol
                <select value={form.roleId} onChange={(event) => setForm((current) => ({ ...current, roleId: event.target.value }))}>
                  <option value="">Selecciona un rol</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field switch-row">
                <span>Activo</span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                />
              </label>
            </div>

            <label className="field">
              {selectedUser ? 'Nueva contrasena (opcional)' : 'Contrasena'}
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={selectedUser ? 'Dejar en blanco para conservarla' : ''}
              />
            </label>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success-text">{success}</p> : null}

            <button type="submit" className="primary" disabled={mutation.isPending || !form.roleId}>
              {mutation.isPending ? 'Guardando...' : selectedUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        )}
      </section>
    </section>
  )
}
