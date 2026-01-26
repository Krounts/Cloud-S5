import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

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

  useEffect(() => {
    const loadReports = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      try {
        setIsLoading(true)
        setErrorMsg('')

        const resp = await fetch('/api/reports', { signal: controller.signal })
        const payload = await resp.json().catch(() => [])
        const raw = Array.isArray(payload) ? payload : payload?.reports ?? payload?.data ?? []
        const normalized = normalizeReports(raw)

        if (!resp.ok || normalized.length === 0) {
          throw new Error('API indisponible')
        }

        setReports(normalized)
      } catch (err) {
        console.warn('Falling back to demo data:', err?.message || err)
        setErrorMsg('Données API indisponibles : affichage d\'exemples pour la démo publique.')
        setReports(fallbackReports)
      } finally {
        clearTimeout(timeout)
        setIsLoading(false)
      }
    }

    loadReports()
  }, [])

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

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: '540px' }}>
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
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 border border-blue-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📊 Récapitulatif</h2>
              <p className="text-sm text-gray-600 mt-1">Vue d'ensemble des signalements</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">📍 Points</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{summary.totalReports}</p>
                  </div>
                  <div className="text-4xl opacity-20">📍</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-amber-100 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">📏 Surface</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{formatNumber(summary.totalArea)} m²</p>
                  </div>
                  <div className="text-4xl opacity-20">📏</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">💰 Budget</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalBudget)}</p>
                  </div>
                  <div className="text-4xl opacity-20">💰</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">⚙️ Avancement</p>
                    <p className="text-3xl font-bold mt-1">{summary.progressPercent}%</p>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-white border-opacity-30 flex items-center justify-center">
                    <span className="text-2xl font-bold">{summary.progressPercent}%</span>
                  </div>
                </div>
                <div className="mt-3 bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${summary.progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">📋 Signalements récents</h3>
              <p className="text-sm text-gray-600 mt-1">{reports.length} signalement{reports.length !== 1 ? 's' : ''} en cours de suivi</p>
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Lecture seule</span>
          </div>
          
          {reports.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">Aucun signalement pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {reports.map((report) => (
                <article 
                  key={report.id} 
                  className="border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 hover:translate-y-[-2px]"
                >
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h4 className="font-bold text-gray-900 text-base leading-tight flex-1">{report.title}</h4>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${statusColors[report.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[report.status] ?? report.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    📅 {formatDate(report.created_at)}
                  </p>
                  
                  <p className="text-sm text-gray-700 mb-4 line-clamp-2 leading-relaxed">
                    {report.description || '—'}
                  </p>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 space-y-2 border border-blue-100">
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">📐</span> {formatNumber(report.area_m2, ' m²')}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">💰</span> {formatCurrency(report.budget)}
                    </div>
                    <div className="text-sm text-gray-700">
                      <span className="font-semibold">🏢</span> {report.company}
                    </div>
                  </div>
                </article>
              ))}
            </div>
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
