import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonGrid, IonRow, IonCol, IonText, IonButton, IonProgressBar, IonButtons, IonFooter, IonModal, IonList, IonItem, IonLabel, IonBadge, IonIcon, useIonRouter } from '@ionic/react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { OfflineTileLayer } from '../components/OfflineTileLayer'
import { offlineMapService } from '../services/OfflineMapService'
import { notificationService, Notification } from '../services/NotificationService'
import { useLocationContext } from '../context/LocationContext'
import { notifications as notificationsIcon, checkmarkCircle, trash } from 'ionicons/icons'

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

// Composant pour détecter les clics sur la carte
const MapClickHandler: React.FC<{ onLocationSelected: (lat: number, lng: number) => void }> = ({ onLocationSelected }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelected(e.latlng.lat, e.latlng.lng)
    },
  })
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
        user_id: (item as any).user_id ?? null,
        title: (item as any).title ?? (item as any).name ?? 'Signalement routier',
        description: (item as any).description ?? '',
        latitude: lat,
        longitude: lng,
        status: (item as any).status ?? 'new',
        area_m2: Number((item as any).area_m2 ?? (item as any).area ?? 0),
        budget: Number((item as any).budget ?? 0),
        company: (item as any).company ?? (item as any).contractor ?? 'Non renseigné',
        photos: Array.isArray((item as any).photos) ? (item as any).photos : [],
        created_at: (item as any).created_at ?? (item as any).date ?? (item as any).createdAt ?? new Date().toISOString(),
      }
    })
    .filter(Boolean) as any[]
}

const MapPage: React.FC = () => {
  const router = useIonRouter()
  const { setSelectedLocation } = useLocationContext()
  const [reports, setReports] = useState<any[]>(fallbackReports)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [cacheSize, setCacheSize] = useState(0)
  const [tempLocation, setTempLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  
  // État pour les notifications
  const [notificationsList, setNotificationsList] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const unreadCount = notificationsList.filter(n => !n.read).length
  
  // État pour filtrer "Mes signalements uniquement"
  const [showMyReportsOnly, setShowMyReportsOnly] = useState(false)
  
  // Vérifier si l'utilisateur est connecté et récupérer son ID
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  
  useEffect(() => {
    const checkLogin = () => {
      const token = localStorage.getItem('token')
      console.log('Token found:', token ? 'yes' : 'no')
      if (!token) {
        setIsLoggedIn(false)
        setCurrentUserId(null)
        return
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        console.log('Token payload:', payload)
        const userId = payload.user_id || payload.sub || payload.id || null
        setCurrentUserId(userId)
        setIsLoggedIn(userId !== null)
      } catch (e) {
        console.error('Token decode error:', e)
        setIsLoggedIn(false)
        setCurrentUserId(null)
      }
    }
    checkLogin()
    // Vérifier périodiquement (au cas où l'utilisateur se connecte/déconnecte)
    const interval = setInterval(checkLogin, 2000)
    return () => clearInterval(interval)
  }, [])
  
  // Reports filtrés selon l'option "Mes signalements"
  const filteredReports = useMemo(() => {
    if (!showMyReportsOnly) return reports
    if (!currentUserId) return reports
    return reports.filter(r => r.user_id === currentUserId)
  }, [reports, showMyReportsOnly])

  // S'abonner aux changements de notifications
  useEffect(() => {
    setNotificationsList(notificationService.getNotifications())
    const unsubscribe = notificationService.subscribe(setNotificationsList)
    return unsubscribe
  }, [])

  // Exposer la fonction sur window pour que les popups Leaflet puissent l'appeler
  useEffect(() => {
    (window as any).openPhotosModal = (reportId: number) => {
      const report = reports.find(r => r.id === reportId)
      if (report) {
        setSelectedReport(report)
        setShowPhotosModal(true)
      }
    }
    return () => {
      delete (window as any).openPhotosModal
    }
  }, [reports])

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
        const resp = await fetch('http://localhost:3001/api/reports', { signal: controller.signal })
        const payload = await resp.json().catch(() => [])
        const raw = Array.isArray(payload) ? payload : (payload as any)?.reports ?? (payload as any)?.data ?? []
        const normalized = normalizeReports(raw)
        if (!resp.ok) throw new Error('API indisponible')
        
        // Vérifier les changements de statut et créer des notifications
        notificationService.checkForStatusChanges(normalized)
        
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
    const reportsToUse = showMyReportsOnly ? filteredReports : reports
    const totalReports = reportsToUse.length
    const totalArea = reportsToUse.reduce((s, r) => s + (Number((r as any).area_m2) || 0), 0)
    const totalBudget = reportsToUse.reduce((s, r) => s + (Number((r as any).budget) || 0), 0)
    const progressValue = reportsToUse.reduce((s, r) => s + (statusProgress[(r as any).status] ?? 0), 0)
    const progressPercent = totalReports ? Math.round(progressValue / totalReports) : 0
    return { totalReports, totalArea, totalBudget, progressPercent }
  }, [reports, filteredReports, showMyReportsOnly])

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

  const handleLocationSelected = (lat: number, lng: number) => {
    setTempLocation({ lat, lng })
  }

  const handleReportClick = (lat: number, lng: number) => {
    const location = { lat, lng }
    setSelectedLocation(location)
    sessionStorage.setItem('reportLocation', JSON.stringify(location))
    setTempLocation(null)
    router.push(`/report?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`, 'forward', 'push')
  }

  const openLightbox = (src: string) => {
    setLightboxSrc(src)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ 
          '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '--color': 'white'
        } as any}>
          <IonButtons slot="start">
            <IonButton 
              onClick={() => {
                console.log('Notification button clicked')
                setShowNotifications(true)
              }} 
              style={{ position: 'relative', '--color': 'white' } as any}
            >
              <IonIcon icon={notificationsIcon} style={{ fontSize: 24 }} />
              {unreadCount > 0 && (
                <IonBadge 
                  color="danger" 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    right: 0, 
                    fontSize: 10, 
                    minWidth: 18, 
                    height: 18,
                    borderRadius: 9
                  }}
                >
                  {unreadCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
          <IonTitle style={{ fontWeight: 700, letterSpacing: '0.5px' }}>🗺️ Carte des travaux</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => loadReports()} disabled={loading} size="small" style={{ '--color': 'white' } as any}>
              {loading ? '...' : '🔄'}
            </IonButton>
            <IonButton onClick={handleDownloadMap} disabled={downloading} size="small" style={{ '--color': 'white' } as any}>
              {downloading ? '...' : '📥'}
            </IonButton>
            {cacheSize > 0 && (
              <IonButton onClick={handleClearCache} size="small" style={{ '--color': '#fca5a5' } as any}>
                🗑️
              </IonButton>
            )}
          </IonButtons>
        </IonToolbar>
        {downloading && <IonProgressBar value={downloadProgress / 100} style={{ '--background': 'rgba(255,255,255,0.3)', '--progress-background': '#10b981' } as any} />}
      </IonHeader>
      <IonContent fullscreen style={{ '--background': '#f1f5f9' } as any}>
        {error && (
          <IonText color="warning"><p style={{ padding: 12, margin: 0 }}>{error}</p></IonText>
        )}
        
        {/* Carte récapitulative stylée */}
        <div style={{ 
          margin: 12, 
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '12px 16px',
            color: 'white',
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>📊 {showMyReportsOnly ? 'Mes signalements' : 'Statistiques des travaux'}</span>
            {/* Bouton filtre mes signalements - toujours visible */}
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  alert('Connectez-vous sur la page Profil pour voir vos signalements')
                  return
                }
                setShowMyReportsOnly(!showMyReportsOnly)
              }}
              style={{
                background: showMyReportsOnly 
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                  : 'rgba(255,255,255,0.2)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 8,
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                backdropFilter: 'blur(10px)'
              }}
            >
              {showMyReportsOnly ? '✓ Mes signalements' : '👤 Voir les miens'}
            </button>
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                padding: 12,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{summary.totalReports}</div>
                <div style={{ fontSize: 11, color: '#166534', fontWeight: 500, textTransform: 'uppercase' }}>Points</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                padding: 12,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#7c3aed' }}>{summary.progressPercent}%</div>
                <div style={{ fontSize: 11, color: '#5b21b6', fontWeight: 500, textTransform: 'uppercase' }}>Avancement</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                padding: 12,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#d97706' }}>{fmtNum(summary.totalArea)}</div>
                <div style={{ fontSize: 11, color: '#92400e', fontWeight: 500, textTransform: 'uppercase' }}>Surface m²</div>
              </div>
              <div style={{ 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                padding: 12,
                borderRadius: 12,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8' }}>{fmtCur(summary.totalBudget)}</div>
                <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 500, textTransform: 'uppercase' }}>Budget</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 'calc(100vh - 280px)', width: '100%', position: 'relative' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>Chargement de la carte…</div>
          ) : (
            <MapContainer 
              center={[-18.8792, 47.5079]} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              tap={false}
              closePopupOnClick={false}
            >
              <MapResizer />
              <MapClickHandler onLocationSelected={handleLocationSelected} />
              <OfflineTileLayer 
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {filteredReports.map((r: any) => (
                <Marker 
                  key={r.id} 
                  position={[r.latitude, r.longitude]}
                  eventHandlers={{
                    click: () => {
                      // Quand on clique sur un marker, afficher ses infos et photos
                      setSelectedReport(r)
                    }
                  }}
                >
                  <Popup autoClose={false} closeOnClick={false}>
                    <div className="custom-popup-mobile" style={{ minWidth: 200, maxWidth: 300 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: '#4b5563' }}>{statusLabels[r.status] ?? r.status}</div>
                      </div>

                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{fmtDate(r.created_at)}</div>

                      <div style={{ marginTop: 8, background: '#ffffff', padding: 8, borderRadius: 10, border: '1px solid rgba(15,23,42,0.04)' }}>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>📐 <strong>{fmtNum(r.area_m2, ' m²')}</strong></div>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>💰 <strong>{fmtCur(r.budget)}</strong></div>
                        <div style={{ fontSize: 13 }}>🏢 {r.company}</div>
                      </div>

                      {Array.isArray(r.photos) && r.photos.length > 0 && (
                        <div style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>📷 {r.photos.length} photo(s)</div>
                          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                            {r.photos.slice(0, 4).map((src: string, idx: number) => (
                              <img
                                key={idx}
                                src={src}
                                alt={`Photo ${idx + 1}`}
                                onClick={(e) => { e.stopPropagation(); setLightboxSrc(src) }}
                                style={{
                                  height: 72,
                                  width: 72,
                                  objectFit: 'cover',
                                  borderRadius: 8,
                                  border: '1px solid #e6eefc',
                                  boxShadow: '0 8px 20px rgba(2,6,23,0.06)',
                                  cursor: 'pointer',
                                  flexShrink: 0
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
              {tempLocation && (
                <Marker position={[tempLocation.lat, tempLocation.lng]}>
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ marginBottom: 8 }}>Cliquez sur le bouton ci-dessous pour signaler</div>
                      <IonButton
                        expand="block"
                        size="small"
                        color="success"
                        onClick={() => handleReportClick(tempLocation.lat, tempLocation.lng)}
                      >
                        🚨 Signaler ici
                      </IonButton>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}
        </div>
      </IonContent>

      {/* Lightbox plein écran pour agrandir une photo */}
      {lightboxSrc && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.95)', 
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <button 
            onClick={() => setLightboxSrc(null)}
            style={{ 
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: 10, 
              cursor: 'pointer', 
              fontWeight: 600,
              color: 'white',
              fontSize: 16,
              backdropFilter: 'blur(10px)',
              zIndex: 100000
            }}
          >
            ✕ Fermer
          </button>
          <img
            src={lightboxSrc}
            alt="Agrandissement"
            style={{ 
              maxWidth: '90%', 
              maxHeight: '80%', 
              borderRadius: 12, 
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
        </div>
      )}

      {/* Panneau des notifications (plein écran) */}
      {showNotifications && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: '#f8fafc', 
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            padding: '20px 16px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
          }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🔔</span> Notifications
            </h2>
            <button 
              onClick={() => setShowNotifications(false)}
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: 10, 
                cursor: 'pointer', 
                fontWeight: 600,
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
            >
              ✕ Fermer
            </button>
          </div>
          
          <div style={{ 
            padding: '12px 16px', 
            display: 'flex', 
            gap: 10, 
            justifyContent: 'flex-end', 
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            {notificationsList.length > 0 && (
              <>
                <button 
                  onClick={() => notificationService.markAllAsRead()}
                  style={{ 
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                    border: 'none', 
                    padding: '8px 14px', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  ✓ Tout lire
                </button>
                <button 
                  onClick={() => notificationService.clearAll()}
                  style={{ 
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
                    border: 'none', 
                    padding: '8px 14px', 
                    borderRadius: 8, 
                    cursor: 'pointer', 
                    fontSize: 13, 
                    fontWeight: 600,
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  🗑️ Effacer
                </button>
              </>
            )}
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {notificationsList.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                background: 'white',
                borderRadius: 16,
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <div style={{ 
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  fontSize: 36
                }}>🔔</div>
                <p style={{ color: '#475569', fontWeight: 600, fontSize: 16 }}>Aucune notification</p>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>Vous serez notifié quand le statut de vos signalements change</p>
                <div style={{ 
                  marginTop: 20, 
                  padding: 12, 
                  background: localStorage.getItem('token') 
                    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' 
                    : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: 10,
                  fontSize: 12
                }}>
                  {localStorage.getItem('token') 
                    ? <span style={{ color: '#166534' }}>✓ Connecté - Notifications de vos signalements uniquement</span>
                    : <span style={{ color: '#92400e' }}>⚠️ Non connecté - Connectez-vous pour recevoir vos notifications personnelles</span>}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notificationsList.map((notif) => (
                  <div 
                    key={notif.id} 
                    style={{ 
                      padding: 16,
                      background: 'white',
                      borderLeft: notif.read ? '4px solid #cbd5e1' : '4px solid #667eea',
                      borderRadius: 12,
                      cursor: 'pointer',
                      boxShadow: notif.read ? '0 2px 8px rgba(0,0,0,0.05)' : '0 4px 15px rgba(102, 126, 234, 0.15)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => notificationService.markAsRead(notif.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ 
                          margin: '0 0 6px 0', 
                          fontWeight: notif.read ? 500 : 700,
                          color: notif.read ? '#64748b' : '#1e293b',
                          fontSize: 15
                        }}>
                          {notif.read ? '' : '🔵 '}{notif.reportTitle}
                        </h4>
                        <p style={{ margin: '0 0 8px 0', fontSize: 14, color: '#475569' }}>{notif.message}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                          🕐 {new Date(notif.timestamp).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          notificationService.deleteNotification(notif.id)
                        }}
                        style={{ 
                          background: '#fee2e2', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: '#dc2626', 
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          fontSize: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </IonPage>
  )
}

export default MapPage
