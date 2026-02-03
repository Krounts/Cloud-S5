import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import FirebaseService from './services/FirebaseService'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const fallbackReports = [
  {
    id: 1,
    title: 'Nid-de-poule majeur',
    description: 'Trou profond nécessitant une réfection urgente',
    latitude: -18.9065,
    longitude: 47.5162,
    status: 'in_progress',
    area_m2: 120,
    budget: 4200000,
    company: 'SOGEA Tana',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 2,
    title: 'Chaussée fissurée',
    description: 'Reprise de la couche de roulement',
    latitude: -18.8843,
    longitude: 47.5071,
    status: 'new',
    area_m2: 80,
    budget: 2300000,
    company: 'Colas Madagascar',
    created_at: '2026-01-16T10:30:00Z',
  },
  {
    id: 3,
    title: 'Affaissement de voie',
    description: 'Travaux de comblement terminés',
    latitude: -18.8741,
    longitude: 47.5224,
    status: 'completed',
    area_m2: 45,
    budget: 1500000,
    company: 'Entreprise RAZAFI',
    created_at: '2025-12-22T14:15:00Z',
  },
]

const statusLabels = {
  new: 'Nouveau',
  in_progress: 'En cours',
  completed: 'Terminé',
  closed: 'Terminé',
}

const statusProgress = {
  new: 0,
  in_progress: 50,
  completed: 100,
  closed: 100,
}

const statusColors = {
  new: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  closed: 'bg-green-100 text-green-800',
}

const normalizeReports = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, idx) => {
      const lat = Number(item.latitude ?? item.lat ?? item.y)
      const lng = Number(item.longitude ?? item.lng ?? item.x)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

      return {
        id: item.id ?? idx,
        title: item.title ?? item.name ?? 'Signalement routier',
        description: item.description ?? '',
        latitude: lat,
        longitude: lng,
        status: item.status ?? 'new',
        area_m2: Number(item.area_m2 ?? item.area ?? 0),
        budget: Number(item.budget ?? 0),
        company: item.company ?? item.contractor ?? 'Non renseigné',
        created_at: item.created_at ?? item.date ?? item.createdAt ?? new Date().toISOString(),
      }
    })
    .filter(Boolean)
}

function App() {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '')
  const [adminUser, setAdminUser] = useState(() => {
    const raw = localStorage.getItem('adminUser')
    return raw ? JSON.parse(raw) : null
  })
  const [adminTab, setAdminTab] = useState('reports')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [users, setUsers] = useState([])
  const [lockedOnly, setLockedOnly] = useState(true)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'user' })

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } finally {
      clearTimeout(id)
    }
  }

  const loadReports = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      setIsLoading(true)
      setErrorMsg('')

      // Détecter si on est en ligne
      const isOnline = navigator.onLine

      if (isOnline) {
        // MODE EN LIGNE : Charger depuis Firebase
        try {
          if (!FirebaseService.isInitialized()) {
            await FirebaseService.initialize()
          }
          const firebaseReports = await FirebaseService.fetchReports()
          if (firebaseReports.length > 0) {
            console.log('Reports loaded from Firebase (online mode):', firebaseReports.length)
            setReports(firebaseReports)
            return
          } else {
            console.log('No reports in Firebase, trying PostgreSQL...')
          }
        } catch (firebaseError) {
          console.warn('Firebase failed, falling back to PostgreSQL:', firebaseError)
        }
      }

      // MODE HORS LIGNE ou fallback : Charger depuis PostgreSQL
      console.log('Loading from PostgreSQL (offline mode or fallback)')
      const resp = await fetch('/api/reports', { signal: controller.signal })
      const payload = await resp.json().catch(() => [])
      const raw = Array.isArray(payload) ? payload : payload?.reports ?? payload?.data ?? []
      const normalized = normalizeReports(raw)

      if (!resp.ok) {
        throw new Error('API indisponible')
      }

      setReports(normalized)
    } catch (err) {
      console.warn('Falling back to demo data:', err?.message || err)
      setErrorMsg('Données indisponibles : affichage d\'exemples pour la démo.')
      setReports(fallbackReports)
    } finally {
      clearTimeout(timeout)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const adminFetch = async (path, options = {}) => {
    const resp = await fetchWithTimeout(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
    })
    const text = await resp.text()
    const data = text ? JSON.parse(text) : null
    if (!resp.ok) {
      throw new Error(data?.error || `Erreur API (${resp.status})`)
    }
    return data
  }

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setAdminError('')
    setAdminMessage('')
    setAdminLoading(true)
    try {
      const resp = await fetchWithTimeout('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data?.error || 'Connexion échouée')
      if (!['admin', 'manager'].includes(data?.user?.role)) {
        throw new Error('Compte non autorisé')
      }
      setAdminToken(data.token)
      setAdminUser(data.user)
      localStorage.setItem('adminToken', data.token)
      localStorage.setItem('adminUser', JSON.stringify(data.user))
      setAdminMessage('Connexion admin réussie')
    } catch (err) {
      setAdminError(err.message || 'Connexion échouée')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleAdminLogout = () => {
    setAdminToken('')
    setAdminUser(null)
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminUser')
  }

  const loadUsers = async () => {
    setAdminError('')
    setAdminLoading(true)
    try {
      const data = await adminFetch(`/api/admin/users${lockedOnly ? '?locked=true' : ''}`)
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setAdminError(err.message || 'Erreur chargement utilisateurs')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setAdminError('')
    setAdminMessage('')
    setAdminLoading(true)
    try {
      await adminFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(newUser) })
      setAdminMessage('Utilisateur créé')
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'user' })
      await loadUsers()
    } catch (err) {
      setAdminError(err.message || 'Erreur création utilisateur')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleUnlockUser = async (userId) => {
    setAdminError('')
    setAdminMessage('')
    setAdminLoading(true)
    try {
      await adminFetch('/api/admin/reset-attempts', { method: 'POST', body: JSON.stringify({ userId }) })
      setAdminMessage('Utilisateur débloqué')
      await loadUsers()
    } catch (err) {
      setAdminError(err.message || 'Erreur déblocage utilisateur')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleReportFieldChange = (id, field, value) => {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const handleUpdateReport = async (report) => {
    setAdminError('')
    setAdminMessage('')
    setAdminLoading(true)
    try {
      const payload = {
        id: report.id,
        title: report.title,
        description: report.description,
        area_m2: Number(report.area_m2) || 0,
        budget: Number(report.budget) || 0,
        company: report.company,
        status: report.status,
      }
      const data = await adminFetch('/api/admin/reports/update', { method: 'POST', body: JSON.stringify(payload) })
      if (data?.report) {
        setReports((prev) => prev.map((r) => (r.id === data.report.id ? { ...r, ...data.report } : r)))
      }
      setAdminMessage('Signalement mis à jour')
    } catch (err) {
      setAdminError(err.message || 'Erreur mise à jour signalement')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleSync = async () => {
    setAdminError('')
    setAdminMessage('')
    setAdminLoading(true)
    try {
      const data = await adminFetch('/api/admin/sync-firebase', { method: 'POST' })
      const imported = data?.imported ?? 0
      const msg = data?.message || 'Synchronisation terminée'
      setAdminMessage(`${msg} - ${imported} signalement(s) importé(s)`)
      // Recharger les signalements
      await loadReports()
    } catch (err) {
      setAdminError(err.message || 'Erreur synchronisation')
    } finally {
      setAdminLoading(false)
    }
  }

  const handlePushToFirebase = async () => {
    setAdminError('')
    setAdminMessage('')
    setAdminLoading(true)
    try {
      const data = await adminFetch('/api/admin/push-to-firebase', { method: 'POST' })
      const pushed = data?.pushed ?? 0
      const total = data?.total ?? 0
      const msg = data?.message || 'Envoi terminé'
      setAdminMessage(`${msg} - ${pushed}/${total} signalement(s) envoyé(s) vers Firebase`)
    } catch (err) {
      setAdminError(err.message || 'Erreur envoi Firebase')
    } finally {
      setAdminLoading(false)
    }
  }

  useEffect(() => {
    if (adminToken) {
      loadUsers()
    }
  }, [adminToken, lockedOnly])

  const summary = useMemo(() => {
    const totalReports = reports.length
    const totalArea = reports.reduce((sum, r) => sum + (Number(r.area_m2) || 0), 0)
    const totalBudget = reports.reduce((sum, r) => sum + (Number(r.budget) || 0), 0)
    const progressValue = reports.reduce((sum, r) => sum + (statusProgress[r.status] ?? 0), 0)
    const progressPercent = totalReports ? Math.round(progressValue / totalReports) : 0
    return { totalReports, totalArea, totalBudget, progressPercent }
  }, [reports])

  const formatDate = (value) => {
    const d = new Date(value)
    return Number.isNaN(d.getTime())
      ? 'Date inconnue'
      : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatNumber = (value, suffix = '') =>
    `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0)}${suffix}`

  const formatCurrency = (value) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(value || 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">🗺️ Carte publique des travaux routiers</h1>
              <p className="text-blue-100 text-sm mt-1">Suivi en temps réel des signalements routiers à Antananarivo</p>
            </div>
            <div className="text-xs text-blue-100 bg-blue-700 px-4 py-2 rounded-lg border border-blue-500 w-fit">
              👤 Visiteurs • 📊 Données publiques
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {errorMsg && (
          <div className="bg-amber-50 border-l-4 border-amber-400 text-amber-800 px-4 py-4 rounded-lg shadow-sm">
            <p className="font-semibold">⚠️ Attention</p>
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        <section className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">🛡️ Module Admin</h2>
              <p className="text-sm text-gray-600 mt-1">Connexion, utilisateurs, synchronisation, gestion des signalements</p>
            </div>
            {adminUser && (
              <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-full">
                {adminUser.firstName} {adminUser.lastName} • {adminUser.role}
              </div>
            )}
          </div>

          {adminError && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-800 px-4 py-3 rounded-lg mb-4 text-sm">
              {adminError}
            </div>
          )}
          {adminMessage && (
            <div className="bg-green-50 border-l-4 border-green-400 text-green-800 px-4 py-3 rounded-lg mb-4 text-sm">
              {adminMessage}
            </div>
          )}

          {!adminToken ? (
            <form onSubmit={handleAdminLogin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="border rounded-lg px-3 py-2"
                type="email"
                placeholder="Email admin"
                value={loginForm.email}
                onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
              <input
                className="border rounded-lg px-3 py-2"
                type="password"
                placeholder="Mot de passe"
                value={loginForm.password}
                onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
              <button
                className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-blue-700"
                type="submit"
                disabled={adminLoading}
              >
                {adminLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <div>
              <div className="admin-tabs">
                {['reports', 'users', 'sync'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAdminTab(tab)}
                    className={`tab-button ${adminTab === tab ? 'active' : ''}`}
                  >
                    {tab === 'reports' && '📋 Signalements'}
                    {tab === 'users' && '👥 Utilisateurs'}
                    {tab === 'sync' && '🔄 Synchronisation'}
                  </button>
                ))}
                <button onClick={handleAdminLogout} className="tab-button tab-button-logout">
                  🚪 Déconnexion
                </button>
              </div>

              {adminTab === 'reports' && (
                <div className="section">
                  <h3>📋 Gestion des signalements</h3>
                  {reports.length === 0 ? (
                    <p className="text-gray-500">Aucun signalement</p>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="report-edit-card">
                        <div className="report-edit-grid">
                          <div className="form-group" style={{gridColumn: '1 / -1'}}>
                            <label>Titre</label>
                            <input
                              type="text"
                              value={report.title || ''}
                              onChange={(e) => handleReportFieldChange(report.id, 'title', e.target.value)}
                              placeholder="Titre du problème"
                            />
                          </div>
                          <div className="form-group" style={{gridColumn: '1 / -1'}}>
                            <label>Description</label>
                            <textarea
                              value={report.description || ''}
                              onChange={(e) => handleReportFieldChange(report.id, 'description', e.target.value)}
                              placeholder="Détails du problème"
                            />
                          </div>
                          <div className="form-group">
                            <label>Surface (m²)</label>
                            <input
                              type="number"
                              value={report.area_m2 ?? ''}
                              onChange={(e) => handleReportFieldChange(report.id, 'area_m2', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Budget (MGA)</label>
                            <input
                              type="number"
                              value={report.budget ?? ''}
                              onChange={(e) => handleReportFieldChange(report.id, 'budget', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Entreprise</label>
                            <input
                              type="text"
                              value={report.company || ''}
                              onChange={(e) => handleReportFieldChange(report.id, 'company', e.target.value)}
                              placeholder="Nom de l'entreprise"
                            />
                          </div>
                          <div className="form-group">
                            <label>Statut</label>
                            <select
                              value={report.status}
                              onChange={(e) => handleReportFieldChange(report.id, 'status', e.target.value)}
                            >
                              <option value="new">Nouveau</option>
                              <option value="in_progress">En cours</option>
                              <option value="completed">Terminé</option>
                              <option value="closed">Clos</option>
                            </select>
                          </div>
                          <button
                            className="button-primary"
                            onClick={() => handleUpdateReport(report)}
                            disabled={adminLoading}
                            style={{height: 'fit-content'}}
                          >
                            ✓ Mettre à jour
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === 'users' && (
                <div className="section">
                  <h3>👥 Gestion des utilisateurs</h3>
                  
                  <form onSubmit={handleCreateUser} className="create-user-form">
                    <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem'}}>
                      <span style={{fontWeight: 600, color: 'var(--primary)'}}>➕ Créer un nouvel utilisateur</span>
                    </div>
                    <div className="create-user-grid">
                      <div className="form-group">
                        <label>Email</label>
                        <input 
                          type="email"
                          placeholder="utilisateur@example.com" 
                          value={newUser.email} 
                          onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Mot de passe</label>
                        <input 
                          type="password"
                          placeholder="••••••••" 
                          value={newUser.password} 
                          onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Prénom</label>
                        <input 
                          type="text"
                          placeholder="Prénom" 
                          value={newUser.firstName} 
                          onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))} 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Nom</label>
                        <input 
                          type="text"
                          placeholder="Nom" 
                          value={newUser.lastName} 
                          onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))} 
                          required 
                        />
                      </div>
                      <div className="form-group">
                        <label>Rôle</label>
                        <select 
                          value={newUser.role} 
                          onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                        >
                          <option value="user">Utilisateur</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <button className="button-primary" type="submit" disabled={adminLoading} style={{height: 'fit-content'}}>
                        ➕ Créer
                      </button>
                    </div>
                  </form>

                  <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', cursor: 'pointer'}}>
                      <input 
                        type="checkbox" 
                        checked={lockedOnly} 
                        onChange={(e) => setLockedOnly(e.target.checked)} 
                        style={{cursor: 'pointer'}}
                      />
                      Afficher seulement les comptes bloqués
                    </label>
                    <button onClick={loadUsers} className="button-secondary" style={{padding: '0.6rem 1rem'}}>
                      🔄 Rafraîchir
                    </button>
                  </div>

                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Nom</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{textAlign: 'center', color: 'var(--gray-500)'}}>
                            Aucun utilisateur
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id}>
                            <td><strong>{u.email}</strong></td>
                            <td>{u.first_name} {u.last_name}</td>
                            <td>
                              <span style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary)'}}>
                                {u.role}
                              </span>
                            </td>
                            <td>
                              <span className={`user-status-badge ${u.is_locked ? 'user-locked' : 'user-unlocked'}`}>
                                {u.is_locked ? '🔒 Bloqué' : '✓ Actif'}
                              </span>
                            </td>
                            <td>
                              {u.is_locked && (
                                <button 
                                  className="button-danger"
                                  onClick={() => handleUnlockUser(u.id)}
                                  disabled={adminLoading}
                                >
                                  🔓 Débloquer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {adminTab === 'sync' && (
                <div className="section">
                  <h3>🔄 Synchronisation Firebase ↔ PostgreSQL</h3>
                  
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
                    <div style={{padding: '1.5rem', backgroundColor: 'var(--primary-light)', borderRadius: '10px', border: '2px solid var(--primary)'}}>
                      <h4 style={{margin: '0 0 0.75rem 0', color: 'var(--primary)', fontWeight: 700}}>⬇️ Importer depuis Firebase</h4>
                      <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--gray-600)'}}>
                        Récupérer les signalements en ligne (Firebase → PostgreSQL)
                      </p>
                      <button 
                        className="sync-button"
                        onClick={handleSync} 
                        disabled={adminLoading}
                      >
                        ⬇️ {adminLoading ? 'Synchronisation...' : 'Importer depuis Firebase'}
                      </button>
                    </div>

                    <div style={{padding: '1.5rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '2px solid #10b981'}}>
                      <h4 style={{margin: '0 0 0.75rem 0', color: '#065f46', fontWeight: 700}}>⬆️ Pousser vers Firebase</h4>
                      <p style={{margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--gray-600)'}}>
                        Envoyer les signalements locaux vers Firebase (PostgreSQL → Firebase)
                      </p>
                      <button 
                        className="sync-button"
                        style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}
                        onClick={handlePushToFirebase} 
                        disabled={adminLoading}
                      >
                        ⬆️ {adminLoading ? 'Envoi...' : 'Pousser vers Firebase'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: '540px' }}>
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
              <span>Chargement de la carte...</span>
            </div>
          ) : (
            <MapContainer
              center={[-18.8792, 47.5079]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {reports.map((report) => (
                <Marker key={report.id} position={[report.latitude, report.longitude]}>
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.98} permanent={false}>
                    <div className="text-sm space-y-2">
                      <div className="font-bold text-gray-900">{report.title}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${statusColors[report.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {statusLabels[report.status] ?? report.status}
                        </span>
                        <span className="text-gray-500">{formatDate(report.created_at)}</span>
                      </div>
                      <div className="bg-gray-50 px-2 py-1 rounded text-xs text-gray-700 space-y-0.5">
                        <div>📐 Surface: {formatNumber(report.area_m2, ' m²')}</div>
                        <div>💰 Budget: {formatCurrency(report.budget)}</div>
                        <div>🏢 {report.company}</div>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              ))}
            </MapContainer>
          )}
        </section>

        <footer className="text-center text-sm text-gray-600 py-6 border-t border-gray-200 mt-8">
          <p>Cloud S5 - Système de signalement routier pour Antananarivo © 2026</p>
        </footer>
      </main>
    </div>
  )
}

export default App
