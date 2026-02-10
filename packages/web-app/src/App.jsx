import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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
        user_id: item.user_id ?? null,
        title: item.title ?? item.name ?? 'Signalement routier',
        description: item.description ?? '',
        latitude: lat,
        longitude: lng,
        status: item.status ?? 'new',
        area_m2: Number(item.area_m2 ?? item.area ?? 0),
        budget: Number(item.budget ?? 0),
        severity_level: Number(item.severity_level ?? 1),
        company: item.company ?? item.contractor ?? 'Non renseigné',
        photos: Array.isArray(item.photos) ? item.photos : [],
        created_at: item.created_at ?? item.date ?? item.createdAt ?? new Date().toISOString(),
        started_at: item.started_at ?? null,
        completed_at: item.completed_at ?? null,
        updated_at: item.updated_at ?? null,
      }
    })
    .filter(Boolean)
}

function App() {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  // Ne pas charger automatiquement le token - forcer la connexion manuelle
  const [adminToken, setAdminToken] = useState('')
  const [adminUser, setAdminUser] = useState(null)
  const [adminTab, setAdminTab] = useState('dashboard')
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminMessage, setAdminMessage] = useState('')
  const [users, setUsers] = useState([])
  const [lockedOnly, setLockedOnly] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState('')
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
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch (err) {
        console.error('Invalid JSON from API:', text)
        throw new Error('Réponse invalide du serveur: ' + text)
      }
    }
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
        severity_level: Number(report.severity_level) || 1,
        company: report.company,
        status: report.status,
      }
      console.log('Updating report:', payload)
      console.log('Admin token:', adminToken ? 'present' : 'missing')
      const data = await adminFetch('/api/admin/reports/update', { method: 'POST', body: JSON.stringify(payload) })
      console.log('Update response:', data)
      if (data?.report) {
        setReports((prev) => prev.map((r) => (r.id === data.report.id ? { ...r, ...data.report } : r)))
      }
      setAdminMessage('Signalement mis à jour avec succès ✓')
    } catch (err) {
      console.error('Update error:', err)
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
      {/* Header amélioré */}
      <header style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%)',
        color: 'white',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: 56, 
                height: 56, 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: 12, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.8rem',
                backdropFilter: 'blur(10px)'
              }}>
                🗺️
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                  Travaux Routiers Antananarivo
                </h1>
                <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: '4px 0 0 0' }}>
                  Plateforme de suivi en temps réel des signalements
                </p>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              background: 'rgba(255,255,255,0.15)',
              padding: '8px 16px',
              borderRadius: 20,
              backdropFilter: 'blur(10px)'
            }}>
              <span style={{ fontSize: '0.8rem' }}>👤 Visiteurs</span>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.3)' }}></span>
              <span style={{ fontSize: '0.8rem' }}>📊 Données publiques</span>
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

        {/* Module Admin amélioré */}
        <section style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {/* En-tête du module admin */}
          <div style={{
            background: adminToken ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: 44, 
                height: 44, 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: 10, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.3rem'
              }}>
                {adminToken ? '✅' : '🔐'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', margin: 0 }}>
                  {adminToken ? 'Espace Manager' : 'Connexion Manager'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', margin: '2px 0 0 0' }}>
                  {adminToken ? 'Gérez les signalements et utilisateurs' : 'Accédez au tableau de bord administrateur'}
                </p>
              </div>
            </div>
            {adminUser && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                padding: '8px 14px',
                borderRadius: 20,
                color: 'white'
              }}>
                <span style={{ 
                  width: 32, 
                  height: 32, 
                  background: 'rgba(255,255,255,0.3)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '0.9rem'
                }}>
                  👔
                </span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{adminUser.firstName} {adminUser.lastName}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.85, textTransform: 'uppercase' }}>{adminUser.role}</div>
                </div>
              </div>
            )}
          </div>

          {/* Contenu du module admin */}
          <div style={{ padding: '1.5rem' }}>
            {adminError && (
              <div style={{ 
                background: '#fef2f2', 
                borderLeft: '4px solid #ef4444', 
                color: '#991b1b', 
                padding: '12px 16px', 
                borderRadius: 8, 
                marginBottom: 16, 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ❌ {adminError}
              </div>
            )}
            {adminMessage && (
              <div style={{ 
                background: '#f0fdf4', 
                borderLeft: '4px solid #22c55e', 
                color: '#166534', 
                padding: '12px 16px', 
                borderRadius: 8, 
                marginBottom: 16, 
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ✅ {adminMessage}
              </div>
            )}

          {!adminToken ? (
            <form onSubmit={handleAdminLogin} style={{ maxWidth: 500, margin: '0 auto' }}>
              <div style={{ 
                background: '#f8fafc', 
                padding: '2rem', 
                borderRadius: 12, 
                border: '1px solid #e2e8f0' 
              }}>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🔑</div>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Entrez vos identifiants pour accéder au tableau de bord</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      📧 Email
                    </label>
                    <input
                      style={{ 
                        width: '100%', 
                        padding: '12px 14px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: 8, 
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      type="email"
                      placeholder="manager@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                      🔒 Mot de passe
                    </label>
                    <input
                      style={{ 
                        width: '100%', 
                        padding: '12px 14px', 
                        border: '1px solid #d1d5db', 
                        borderRadius: 8, 
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                  </div>
                  <button
                    style={{ 
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '0.5rem'
                    }}
                    type="submit"
                    disabled={adminLoading}
                  >
                    {adminLoading ? '⏳ Connexion...' : '🚀 Se connecter'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              <div className="admin-tabs">
                {['dashboard', 'reports', 'users', 'sync'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setAdminTab(tab)}
                    className={`tab-button ${adminTab === tab ? 'active' : ''}`}
                  >
                    {tab === 'dashboard' && '📊 Tableau de bord'}
                    {tab === 'reports' && '📋 Signalements'}
                    {tab === 'users' && '👥 Utilisateurs'}
                    {tab === 'sync' && '🔄 Synchronisation'}
                  </button>
                ))}
                <button onClick={handleAdminLogout} className="tab-button tab-button-logout">
                  🚪 Déconnexion
                </button>
              </div>

              {adminTab === 'dashboard' && (
                  <div className="section">
                  <h3>📊 Tableau de bord - Suivi des travaux</h3>
                  
                  {/* Statistiques globales */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem', alignItems: 'stretch' }}>
                    {/* Card 1 - Nouveaux */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
                      boxShadow: '0 8px 20px rgba(14, 30, 37, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(217, 119, 6, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          🆕
                        </div>
                        <div style={{ fontSize: 13, color: '#92400e', fontWeight: 700 }}>Nouveaux</div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309' }}>{reports.filter(r => r.status === 'new').length}</div>
                        <div style={{ fontSize: 12, color: '#7c2d12' }}>({Math.round((reports.filter(r=>r.status==='new').length / Math.max(1, reports.length)) * 100)}%)</div>
                      </div>
                    </div>

                    {/* Card 2 - En cours */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%)',
                      boxShadow: '0 8px 20px rgba(20, 40, 80, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          🔧
                        </div>
                        <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 700 }}>En cours</div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#1d4ed8' }}>{reports.filter(r => r.status === 'in_progress').length}</div>
                        <div style={{ fontSize: 12, color: '#334155' }}>{Math.round((reports.filter(r=>r.status==='in_progress').length / Math.max(1, reports.length)) * 100)}%</div>
                      </div>
                    </div>

                    {/* Card 3 - Terminés */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                      boxShadow: '0 8px 20px rgba(6, 95, 70, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          ✅
                        </div>
                        <div style={{ fontSize: 13, color: '#065f46', fontWeight: 700 }}>Terminés</div>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>{reports.filter(r => r.status === 'completed' || r.status === 'closed').length}</div>
                        <div style={{ fontSize: 12, color: '#065f46' }}>{Math.round((reports.filter(r=>r.status==='completed' || r.status==='closed').length / Math.max(1, reports.length)) * 100)}%</div>
                      </div>
                    </div>

                    {/* Card 4 - Délai moyen */}
                    <div style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #f5f3ff 0%, #f3e8ff 100%)',
                      boxShadow: '0 8px 20px rgba(92, 16, 153, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          ⏱️
                        </div>
                        <div style={{ fontSize: 13, color: '#5b21b6', fontWeight: 700 }}>Délai moyen</div>
                      </div>
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: '#6d28d9' }}>{(() => {
                            const completed = reports.filter(r => r.completed_at && r.created_at)
                            if (completed.length === 0) return '—'
                            const totalDays = completed.reduce((sum, r) => {
                              const start = new Date(r.created_at)
                              const end = new Date(r.completed_at)
                              return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24))
                            }, 0)
                            return Math.round(totalDays / completed.length) + ' j'
                          })()}</div>
                          <div style={{ fontSize: 12, color: '#6b21a8' }}>&nbsp;</div>
                        </div>
                    </div>

                      {/* Card 5 - Avancement global */}
                      <div style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
                        boxShadow: '0 8px 20px rgba(14, 30, 60, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                            📈
                          </div>
                          <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>Avancement global</div>
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <div style={{ height: 10, background: '#eef2ff', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ width: `${summary.progressPercent}%`, height: '100%', background: 'linear-gradient(90deg,#06b6d4,#3b82f6)' }} />
                          </div>
                          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: '#0b5fa5' }}>{summary.progressPercent}%</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{reports.length} signalement(s)</div>
                          </div>
                        </div>
                      </div>
                  </div>

                  {/* Tableau récapitulatif */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="users-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Titre</th>
                          <th>Avancement</th>
                          <th>Créé le</th>
                          <th>Démarré le</th>
                          <th>Terminé le</th>
                          <th>Délai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                              Aucun signalement
                            </td>
                          </tr>
                        ) : (
                          reports.map((report) => {
                            const progress = report.status === 'new' ? 0 : report.status === 'in_progress' ? 50 : 100
                            const progressColor = progress === 0 ? '#f59e0b' : progress === 50 ? '#3b82f6' : '#10b981'
                            
                            // Calculer le délai
                            let delai = '—'
                            if (report.completed_at && report.created_at) {
                              const days = Math.ceil((new Date(report.completed_at) - new Date(report.created_at)) / (1000 * 60 * 60 * 24))
                              delai = `${days} jour${days > 1 ? 's' : ''}`
                            } else if (report.created_at) {
                              const days = Math.ceil((new Date() - new Date(report.created_at)) / (1000 * 60 * 60 * 24))
                              delai = `${days}j (en cours)`
                            }
                            
                            return (
                              <tr key={report.id}>
                                <td><strong>#{report.id}</strong></td>
                                <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {report.title}
                                </td>
                                <td style={{ minWidth: '150px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ 
                                      flex: 1, 
                                      height: '8px', 
                                      backgroundColor: '#e5e7eb', 
                                      borderRadius: '4px',
                                      overflow: 'hidden'
                                    }}>
                                      <div style={{ 
                                        width: `${progress}%`, 
                                        height: '100%', 
                                        backgroundColor: progressColor,
                                        borderRadius: '4px',
                                        transition: 'width 0.3s ease'
                                      }} />
                                    </div>
                                    <span style={{ 
                                      fontSize: '0.85rem', 
                                      fontWeight: 600, 
                                      color: progressColor,
                                      minWidth: '40px'
                                    }}>
                                      {progress}%
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                    {report.status === 'new' && '🆕 Nouveau'}
                                    {report.status === 'in_progress' && '🔧 En cours'}
                                    {report.status === 'completed' && '✅ Terminé'}
                                    {report.status === 'closed' && '🔒 Clos'}
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>
                                  {report.created_at ? new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>
                                  {report.started_at ? (
                                    <span style={{ color: '#2563eb' }}>
                                      {new Date(report.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#9ca3af' }}>—</span>
                                  )}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>
                                  {report.completed_at ? (
                                    <span style={{ color: '#059669' }}>
                                      {new Date(report.completed_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#9ca3af' }}>—</span>
                                  )}
                                </td>
                                <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                  <span style={{ 
                                    color: report.completed_at ? '#059669' : '#f59e0b',
                                    backgroundColor: report.completed_at ? '#d1fae5' : '#fef3c7',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    {delai}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminTab === 'reports' && (
                <div className="section">
                  <h3>📋 Gestion des signalements</h3>
                  {reports.length === 0 ? (
                    <p className="text-gray-500">Aucun signalement</p>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="report-edit-card">
                        <div className="report-edit-card-header">
                          <div className="header-left">
                            <div className="report-id">#{report.id}</div>
                            <div className="report-meta">
                              <div className="report-title">{report.title || 'Signalement'}</div>
                              <div className="report-sub">{report.company || 'Entreprise non renseignée'} • {formatDate(report.created_at)}</div>
                            </div>
                          </div>
                          <div className="header-right">
                            <span className={`status-badge status-${report.status}`}>{statusLabels[report.status] ?? report.status}</span>
                          </div>
                        </div>

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
                          <div className="form-group">
                            <label>Gravité (1-10)</label>
                            <select
                              value={report.severity_level ?? 1}
                              onChange={(e) => handleReportFieldChange(report.id, 'severity_level', Number(e.target.value))}
                            >
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="report-edit-footer">
                          <div className="footer-left" />
                          <div className="footer-right">
                            <button
                              className="button-primary"
                              onClick={() => handleUpdateReport(report)}
                              disabled={adminLoading}
                            >
                              ✓ Mettre à jour
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {adminTab === 'users' && (
                <div className="section">
                  <h3>👥 Gestion des utilisateurs</h3>
                  
                  <form onSubmit={handleCreateUser} className="create-user-form" autoComplete="off">
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
                          autoComplete="new-email"
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
                          autoComplete="new-password"
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
                          autoComplete="off"
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
                          autoComplete="off"
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
                        <th>Tentatives</th>
                        <th>Statut</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{textAlign: 'center', color: 'var(--gray-500)'}}>
                            Aucun utilisateur
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id}>
                            <td><strong>{u.email}</strong></td>
                            <td>{u.first_name} {u.last_name}</td>
                            <td>
                              <span style={{
                                fontSize: '0.85rem', 
                                fontWeight: 600, 
                                textTransform: 'uppercase', 
                                color: u.role === 'manager' ? '#2563eb' : u.role === 'admin' ? '#dc2626' : 'var(--primary)',
                                backgroundColor: u.role === 'manager' ? '#dbeafe' : u.role === 'admin' ? '#fee2e2' : '#f3f4f6',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}>
                                {u.role === 'manager' ? '👔 ' : u.role === 'admin' ? '👑 ' : '👤 '}{u.role}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: u.failed_login_attempts > 0 ? 600 : 400,
                                color: u.failed_login_attempts >= 3 ? '#dc2626' : u.failed_login_attempts > 0 ? '#f59e0b' : '#6b7280'
                              }}>
                                {u.failed_login_attempts || 0} / 3
                              </span>
                            </td>
                            <td>
                              <span className={`user-status-badge ${u.is_locked ? 'user-locked' : 'user-unlocked'}`}>
                                {u.is_locked ? '🔒 Bloqué' : '✓ Actif'}
                              </span>
                            </td>
                            <td>
                              {u.is_locked ? (
                                <button 
                                  className="button-danger"
                                  onClick={() => handleUnlockUser(u.id)}
                                  disabled={adminLoading}
                                >
                                  🔓 Débloquer
                                </button>
                              ) : (
                                <span style={{color: '#9ca3af', fontSize: '0.85rem'}}>—</span>
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
          </div>
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
                  <Popup closeButton autoPan keepInView>
                    <div className="custom-popup">
                      <div className="cp-head">
                        <div className="cp-title">{report.title}</div>
                        <div className="cp-meta">{formatDate(report.created_at)}</div>
                      </div>

                      <div className="cp-status">
                        <span className={`status-badge status-${report.status}`}>{statusLabels[report.status] ?? report.status}</span>
                      </div>

                      <div className="cp-body">
                        <div className="cp-row">📐 Surface: <strong>{formatNumber(report.area_m2, ' m²')}</strong></div>
                        <div className="cp-row">⚠️ Gravité: <strong>{report.severity_level ?? 1}</strong></div>
                        <div className="cp-row">💰 Budget: <strong>{formatCurrency(report.budget)}</strong></div>
                        <div className="cp-row">🏢 {report.company}</div>
                      </div>

                      {Array.isArray(report.photos) && report.photos.length > 0 && (
                        <div className="cp-photos" onClick={(e)=>e.stopPropagation()}>
                          <div className="cp-photos-count">📷 {report.photos.length} photo(s)</div>
                          <div className="cp-thumb-grid">
                            {report.photos.slice(0, 4).map((src, idx) => (
                              <img
                                key={`${report.id}-photo-${idx}`}
                                src={src}
                                alt={`photo-${idx + 1}`}
                                className="cp-thumb"
                                onClick={(e) => { e.stopPropagation(); setLightboxSrc(src) }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </section>

        {lightboxSrc && (
          <div
            onClick={() => setLightboxSrc('')}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 24,
            }}
          >
            <img
              src={lightboxSrc}
              alt="Agrandissement"
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.35)' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <footer className="text-center text-sm text-gray-600 py-6 border-t border-gray-200 mt-8">
          <p>Cloud S5 - Système de signalement routier pour Antananarivo © 2026</p>
        </footer>
      </main>
    </div>
  )
}

export default App
