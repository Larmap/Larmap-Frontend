import { Pencil, Plus, RefreshCw, Trash2, UserPlus, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { usersApi } from '../api/client'
import { getErrorMessage } from '../api/errors'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import type { User, UserRole } from '../types/api'

interface UserFormState {
  name: string
  email: string
  phone: string
  role: UserRole
}

const emptyForm: UserFormState = {
  name: '',
  email: '',
  phone: '',
  role: 'agent',
}

const roleOptions = [
  { value: '', label: 'Todos os cargos' },
  { value: 'agent', label: 'Agente' },
  { value: 'manager', label: 'Gerente' },
  { value: 'admin', label: 'Admin' },
]

export function UsersPage() {
  const { token } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token) return
    const authToken = token

    let ignore = false

    async function loadUsers() {
      setLoading(true)
      setError('')

      try {
        const data = await usersApi.list(authToken, 50, 0, roleFilter || undefined)
        if (!ignore) {
          setUsers(data.users)
          setTotal(data.total)
        }
      } catch (caughtError) {
        if (!ignore) setError(getErrorMessage(caughtError))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadUsers()

    return () => {
      ignore = true
    }
  }, [token, roleFilter, reloadKey])

  function resetForm() {
    setForm(emptyForm)
    setEditingId('')
  }

  function startEditing(user: User) {
    setEditingId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    setSaving(true)
    setError('')

    try {
      if (editingId) {
        await usersApi.update(token, editingId, {
          name: form.name,
          phone: form.phone || undefined,
          role: form.role,
        })
      } else {
        await usersApi.create(token, {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
        })
      }

      resetForm()
      setReloadKey((current) => current + 1)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!token) return
    const confirmed = window.confirm('Deseja remover este usuário?')
    if (!confirmed) return

    setError('')

    try {
      await usersApi.remove(token, userId)
      setReloadKey((current) => current + 1)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Equipe</span>
          <h1>Usuários</h1>
        </div>
        <div className="heading-actions">
          <button className="primary-button" type="button" onClick={resetForm}>
            <UserPlus size={17} />
            <span>Novo usuário</span>
          </button>
          <button className="secondary-button" type="button" onClick={() => setReloadKey((current) => current + 1)}>
            <RefreshCw size={17} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      {error ? <p className="notice notice--error">{error}</p> : null}

      <section className="team-layout">
        <article className="panel table-panel">
          <div className="panel-header panel-header--with-control">
            <div>
              <span className="eyebrow">{total} registros</span>
              <h2>Lista da equipe</h2>
            </div>

            <select
              className="compact-select"
              onChange={(event) => setRoleFilter(event.target.value)}
              value={roleFilter}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="empty-copy">Carregando usuários...</p>
          ) : users.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Cargo</th>
                    <th>Telefone</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <StatusBadge kind="role" value={user.role} />
                      </td>
                      <td>{user.phone || '-'}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-button" type="button" title="Editar" onClick={() => startEditing(user)}>
                            <Pencil size={17} />
                          </button>
                          <button
                            className="icon-button icon-button--danger"
                            type="button"
                            title="Remover"
                            onClick={() => handleDelete(user.id)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <UsersEmptyIcon />
              <strong>Nenhum usuário encontrado</strong>
              <p>Crie o primeiro corretor ou ajuste o filtro de cargo.</p>
            </div>
          )}
        </article>

        <form className="panel form-panel team-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">{editingId ? 'Editar' : 'Novo'}</span>
              <h2>{editingId ? 'Atualizar usuário' : 'Criar usuário'}</h2>
            </div>

            {editingId ? (
              <button className="icon-button" type="button" title="Cancelar edição" onClick={resetForm}>
                <X size={18} />
              </button>
            ) : null}
          </div>

          <label>
            Nome
            <input
              minLength={2}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              value={form.name}
            />
          </label>

          <label>
            Email
            <input
              disabled={Boolean(editingId)}
              inputMode="email"
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              required
              type="email"
              value={form.email}
            />
          </label>

          <label>
            Telefone
            <input
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              type="tel"
              value={form.phone}
            />
          </label>

          <label>
            Cargo
            <select
              onChange={(event) => setForm({ ...form, role: event.target.value })}
              value={form.role}
            >
              <option value="agent">Agente</option>
              <option value="manager">Gerente</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button className="primary-button" disabled={saving} type="submit">
            {editingId ? <Pencil size={18} /> : <Plus size={18} />}
            <span>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar usuário'}</span>
          </button>
        </form>
      </section>
    </div>
  )
}

function UsersEmptyIcon() {
  return <UserPlus size={30} />
}
