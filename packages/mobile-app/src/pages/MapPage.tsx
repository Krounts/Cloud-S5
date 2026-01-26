import React, { useEffect, useMemo, useState, useRef } from 'react'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonText, IonButton, IonProgressBar, IonButtons } from '@ionic/react'
import { MapContainer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OfflineTileLayer } from '../components/OfflineTileLayer'
import { offlineMapService } from '../services/OfflineMapService'

// Fix for default markers
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const fallbackReports = [
  { id: 1, title: 'Nid-de-poule majeur', description: 'Réfection urgente', latitude: -18.9065, longitude: 47.5162, status: 'in_progress', area_m2: 120, budget: 4200000, company: 'SOGEA Tana', created_at: '2026-01-10T08:00:00Z' },
  { id: 2, title: 'Chaussée fissurée', description: 'Reprise de roulement', latitude: -18.8843, longitude: 47.5071, status: 'new', area_m2: 80, budget: 2300000, company: 'Colas Madagascar', created_at: '2026-01-16T10:30:00Z' },
  { id: 3, title: 'Affaissement de voie', description: 'Terminé', latitude: -18.8741, longitude: 47.5224, status: 'completed', area_m2: 45, budget: 1500000, company: 'Entreprise RAZAFI', created_at: '2025-12-22T14:15:00Z' },
]

const statusLabels: Record<string, string> = { new: 'Nouveau', in_progress: 'En cours', completed: 'Terminé', closed: 'Terminé' }
const statusProgress: Record<string, number> = { new: 0, in_progress: 50, completed: 100, closed: 100 }

// Composant pour forcer le recalcul de la taille de la carte
const MapResizer: React.FC = () => {
  const map = useMap()
  useEffect(() => {
    // Invalider la taille après un court délai pour s'assurer que le conteneur est bien dimensionné
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 100)
    return () => clearTimeout(timer)
  }, [map])
  return null
}

const normalizeReports = (raw: any[]): any[] => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, idx) => {
      const lat = Number((item as any).latitude ?? (item as any).lat ?? (item as any).y)
      const lng = Number((item as any).longitude ?? (item as any).lng ?? (item as any).x)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        id: (item as any).id ?? idx,
        title: (item as any).title ?? (item as any).name ?? 'Signalement routier',
        description: (item as any).description ?? '',
        latitude: lat,
        longitude: lng,
        status: (item as any).status ?? 'new',
        area_m2: Number((item as any).area_m2 ?? (item as any).area ?? 0),
        budget: Number((item as any).budget ?? 0),
        company: (item as any).company ?? (item as any).contractor ?? 'Non renseigné',
        created_at: (item as any).created_at ?? (item as any).date ?? (item as any).createdAt ?? new Date().toISOString(),
      }
    })
    .filter(Boolean) as any[]
}

const MapPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>(fallbackReports)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [cacheSize, setCacheSize] = useState(0)

  useEffect(() => {
    // Charger la taille du cache
    offlineMapService.getCacheSize().then(setCacheSize).catch(console.error)
  }, [])

  const loadReports = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    const run = async () => {
      try {
        setLoading(true)
        setError('')
        const resp = await fetch('/api/reports', { signal: controller.signal })
        const payload = await resp.json().catch(() => [])
        const raw = Array.isArray(payload) ? payload : (payload as any)?.reports ?? (payload as any)?.data ?? []
        const normalized = normalizeReports(raw)
        if (!resp.ok || normalized.length === 0) throw new Error('API indisponible')
        setReports(normalized)
      } catch (e: any) {
        setError("Données API indisponibles : affichage d'exemples.")
        setReports(fallbackReports)
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }
    run()
    return () => { controller.abort(); clearTimeout(timeout) }
  }

  useEffect(() => {
    loadReports()
  }, [])

  const summary = useMemo(() => {
    const totalReports = reports.length
    const totalArea = reports.reduce((s, r) => s + (Number((r as any).area_m2) || 0), 0)
    const totalBudget = reports.reduce((s, r) => s + (Number((r as any).budget) || 0), 0)
    const progressValue = reports.reduce((s, r) => s + (statusProgress[(r as any).status] ?? 0), 0)
    const progressPercent = totalReports ? Math.round(progressValue / totalReports) : 0
    return { totalReports, totalArea, totalBudget, progressPercent }
  }, [reports])

  const fmtDate = (v: any) => {
    const d = new Date(v)
    return isNaN(d.getTime()) ? 'Date inconnue' : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  const fmtNum = (v: any, suf = '') => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v || 0)}${suf}`
  const fmtCur = (v: any) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', maximumFractionDigits: 0 }).format(v || 0)

  const handleDownloadMap = async () => {
    setDownloading(true)
    setDownloadProgress(0)
    try {
      // Zone d'Antananarivo : latitude -18.75 à -19.05, longitude 47.40 à 47.65
      const bounds = {
        minLat: -19.05,
        maxLat: -18.75,
        minLng: 47.40,
        maxLng: 47.65,
      }
      // Télécharger pour les zooms 12, 13, 14 (ville + quartiers)
      for (let zoom = 12; zoom <= 14; zoom++) {
        await offlineMapService.downloadTiles(bounds, zoom, (current, total) => {
          const progress = ((current / total) * 100) / 3 + ((zoom - 12) * 100) / 3
          setDownloadProgress(Math.round(progress))
        })
      }
      const newSize = await offlineMapService.getCacheSize()
      setCacheSize(newSize)
      alert(`Carte téléchargée ! ${newSize} tuiles en cache.`)
    } catch (err: any) {
      alert('Erreur lors du téléchargement : ' + err.message)
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }

  const handleClearCache = async () => {
    if (confirm('Supprimer toutes les cartes hors ligne ?')) {
      try {
        await offlineMapService.clearCache()
        setCacheSize(0)
        alert('Cache supprimé.')
      } catch (err) {
        alert('Erreur lors de la suppression.')
      }
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Carte des travaux</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => loadReports()} disabled={loading} size="small">
              {loading ? 'Actualisation...' : '🔄'}
            </IonButton>
            <IonButton onClick={handleDownloadMap} disabled={downloading} size="small">
              {downloading ? 'Téléchargement...' : 'Télécharger'}
            </IonButton>
            {cacheSize > 0 && (
              <IonButton onClick={handleClearCache} size="small" color="danger">
                Effacer ({cacheSize})
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        {downloading && <IonProgressBar value={downloadProgress / 100} />}
      </IonHeader>
      <IonContent fullscreen>
        {error && (
          <IonText color="warning"><p style={{ padding: 12 }}>{error}</p></IonText>
        )}
        <IonCard style={{ margin: 12 }}>
          <IonCardContent>
            <IonGrid>
              <IonRow>
                <IonCol size="6"><strong>Points</strong><div>{summary.totalReports}</div></IonCol>
                <IonCol size="6"><strong>Avancement</strong><div>{summary.progressPercent}%</div></IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="6"><strong>Surface</strong><div>{fmtNum(summary.totalArea, ' m²')}</div></IonCol>
                <IonCol size="6"><strong>Budget</strong><div>{fmtCur(summary.totalBudget)}</div></IonCol>
              </IonRow>
            </IonGrid>
          </IonCardContent>
        </IonCard>

        <div style={{ height: 'calc(100vh - 280px)', width: '100%', position: 'relative' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Chargement de la carte…</div>
          ) : (
            <MapContainer 
              center={[-18.8792, 47.5079]} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapResizer />
              <OfflineTileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {reports.map((r: any) => (
                <Marker key={r.id} position={[r.latitude, r.longitude]}>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: '#374151', marginBottom: 6 }}>{statusLabels[r.status] ?? r.status} • {fmtDate(r.created_at)}</div>
                      <div style={{ fontSize: 13 }}>Surface: {fmtNum(r.area_m2, ' m²')}</div>
                      <div style={{ fontSize: 13 }}>Budget: {fmtCur(r.budget)}</div>
                      <div style={{ fontSize: 13 }}>Entreprise: {r.company}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default MapPage
