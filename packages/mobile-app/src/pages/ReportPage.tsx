import React, { useState, useEffect } from 'react'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonInput,
  IonLabel,
  IonItem,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonText,
  IonSpinner,
} from '@ionic/react'
import { useLocationContext } from '../context/LocationContext'
import FirebaseService from '../services/FirebaseService'

const ReportPage: React.FC = () => {
  const { selectedLocation, setSelectedLocation } = useLocationContext()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    area_m2: '',
    company: '',
    status: 'new',
    latitude: 0,
    longitude: 0,
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState('Sélectionnez une position sur la carte')
  const [photos, setPhotos] = useState<{ name: string; dataUrl: string }[]>([])

  // Récupérer les coordonnées depuis la carte uniquement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const qLat = Number(params.get('lat'))
    const qLng = Number(params.get('lng'))
    const queryLocation = Number.isFinite(qLat) && Number.isFinite(qLng) ? { lat: qLat, lng: qLng } : null

    const stored = sessionStorage.getItem('reportLocation')
    const storedLocation = stored ? JSON.parse(stored) : null
    const locationToUse = selectedLocation ?? queryLocation ?? storedLocation

    if (locationToUse?.lat && locationToUse?.lng) {
      setFormData((prev) => ({
        ...prev,
        latitude: locationToUse.lat,
        longitude: locationToUse.lng,
      }))
      setLocationStatus(`📍 Carte: ${locationToUse.lat.toFixed(4)}, ${locationToUse.lng.toFixed(4)}`)
      setSelectedLocation(null)
      sessionStorage.removeItem('reportLocation')
    } else {
      setLocationStatus('⚠️ Veuillez choisir un point sur la carte avant de signaler')
    }
  }, [selectedLocation, setSelectedLocation])

  const handleInputChange = (e: any) => {
    const name = e.target?.name || e.currentTarget?.name
    const value = e.detail?.value
    
    if (name) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSelectChange = (value: any) => {
    setFormData((prev) => ({
      ...prev,
      status: value,
    }))
  }

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) {
      return // Ne rien faire si aucun fichier sélectionné
    }

    const readers = files.map(
      (file) =>
        new Promise<{ name: string; dataUrl: string }>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || '') })
          reader.onerror = () => reject(new Error('Lecture du fichier échouée'))
          reader.readAsDataURL(file)
        })
    )

    try {
      const results = await Promise.all(readers)
      // Ajouter les nouvelles photos aux existantes (au lieu de les remplacer)
      setPhotos(prev => [...prev, ...results])
    } catch (err: any) {
      setError('Impossible de lire une ou plusieurs photos')
    }
    
    // Reset l'input pour permettre de re-sélectionner le même fichier
    event.target.value = ''
  }
  
  // Supprimer une photo spécifique
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError('')

    // Validation
    if (!formData.title.trim()) {
      setError('Le titre est obligatoire')
      return
    }
    if (!formData.latitude || !formData.longitude) {
      setError('Veuillez choisir un point sur la carte avant de signaler')
      return
    }

    setLoading(true)

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        area_m2: parseFloat(formData.area_m2) || 0,
        company: formData.company.trim(),
        status: formData.status,
        latitude: formData.latitude,
        longitude: formData.longitude,
      }

      const payloadWithPhotos = {
        ...payload,
        photos: photos.map((p) => p.dataUrl),
      }

      console.log('Sending report:', payload)

      // Envoyer directement à PostgreSQL (backend principal)
      await submitToPostgreSQL(payloadWithPhotos)
      
    } catch (err: any) {
      setError('Erreur: ' + err.message)
      console.error('Failed to submit report:', err)
    } finally {
      setLoading(false)
    }
  }

  const submitToPostgreSQL = async (payload: any) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    // Récupérer le token d'authentification si connecté
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch('http://localhost:3001/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      console.log('Response status:', response.status)
      const text = await response.text()
      console.log('Response text:', text)

      if (!text) {
        throw new Error('Le serveur n\'a pas répondu. Vérifiez que le backend est lancé avec: yarn docker:up')
      }

      let data = null
      try {
        data = JSON.parse(text)
      } catch (err) {
        // If the response is not valid JSON, surface the raw text for easier debugging
        throw new Error('Réponse invalide du serveur: ' + text)
      }

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          title: '',
          description: '',
          area_m2: '',
          company: '',
          status: 'new',
          latitude: payload.latitude,
          longitude: payload.longitude,
        })
        setPhotos([])
        setTimeout(() => setSubmitted(false), 3000)
      } else {
        throw new Error(data?.error || 'Erreur du serveur (' + response.status + ')')
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ 
          '--background': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          '--color': 'white'
        } as any}>
          <IonTitle style={{ fontWeight: 700, letterSpacing: '0.5px' }}>🚧 Signaler un problème</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)' } as any}>
        <div style={{ padding: 16 }}>
          {submitted && (
            <div style={{ 
              padding: 16, 
              marginBottom: 16, 
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', 
              borderRadius: 12, 
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
            }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>Signalement envoyé !</p>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Il sera visible sur la carte</p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ 
              padding: 16, 
              marginBottom: 16, 
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
              borderRadius: 12, 
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)'
            }}>
              <span style={{ fontSize: 24 }}>❌</span>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Carte de localisation */}
          <div style={{ 
            padding: 16, 
            marginBottom: 20, 
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
            borderRadius: 16, 
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.15)'
          }}>
            <span style={{ 
              width: 40,
              height: 40,
              background: 'white',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>📍</span>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#1e40af', fontWeight: 600 }}>Position</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#3b82f6' }}>{locationStatus}</p>
            </div>
          </div>

          {/* Formulaire stylé */}
          <div style={{ 
            background: 'white',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            marginBottom: 20
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '14px 16px',
              color: 'white',
              fontWeight: 600,
              fontSize: 14
            }}>
              📝 Détails du signalement
            </div>

        <IonItem>
          <IonLabel position="floating">Titre du problème *</IonLabel>
          <IonInput name="title" value={formData.title} onIonChange={handleInputChange} placeholder="Ex: Nid-de-poule majeur" />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Description</IonLabel>
          <IonTextarea
            name="description"
            value={formData.description}
            onIonChange={handleInputChange}
            placeholder="Détails du problème..."
          />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Surface (m²)</IonLabel>
          <IonInput name="area_m2" type="number" value={formData.area_m2} onIonChange={handleInputChange} placeholder="0" />
        </IonItem>

        {/* Budget and Gravité removed from mobile report form — computed/assigned in backoffice */}

        <IonItem>
          <IonLabel position="floating">Entreprise responsable</IonLabel>
          <IonInput name="company" value={formData.company} onIonChange={handleInputChange} placeholder="Ex: SOGEA Tana" />
        </IonItem>

        <IonItem>
          <IonLabel>Photos (1 ou plusieurs)</IonLabel>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoChange}
            style={{ marginLeft: 12 }}
          />
        </IonItem>

        {photos.length > 0 && (
          <div style={{ 
            margin: '16px 16px 0',
            padding: 12,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            borderRadius: 12
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#166534' }}>
              📷 {photos.length} photo(s) sélectionnée(s)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {photos.map((photo, index) => (
                <div key={`${photo.name}-${index}`} style={{ 
                  borderRadius: 10, 
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  position: 'relative'
                }}>
                  <img src={photo.dataUrl} alt={photo.name} style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <IonItem>
          <IonLabel>Statut</IonLabel>
          <IonSelect value={formData.status} onIonChange={(e) => handleSelectChange(e.detail.value)}>
            <IonSelectOption value="new">Nouveau</IonSelectOption>
            <IonSelectOption value="in_progress">En cours</IonSelectOption>
            <IonSelectOption value="completed">Terminé</IonSelectOption>
          </IonSelect>
        </IonItem>
          </div>

          {/* Bouton d'envoi stylé */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                borderRadius: 14,
                border: 'none',
                background: loading 
                  ? '#94a3b8' 
                  : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                fontSize: 17,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10
              }}
            >
              {loading ? (
                <>
                  <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
                  Envoi en cours...
                </>
              ) : (
                <>🚀 Envoyer le signalement</>
              )}
            </button>
          </div>

          {/* Notes stylées */}
          <div style={{ 
            padding: 16, 
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <h4 style={{ 
              margin: '0 0 12px', 
              fontSize: 14, 
              fontWeight: 700, 
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              💡 Notes importantes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10,
                padding: 10,
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 13,
                color: '#475569'
              }}>
                <span>📍</span> Sélectionnez la position en cliquant sur la carte
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10,
                padding: 10,
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 13,
                color: '#475569'
              }}>
                <span>✏️</span> Le titre est obligatoire
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10,
                padding: 10,
                background: '#f1f5f9',
                borderRadius: 8,
                fontSize: 13,
                color: '#475569'
              }}>
                <span>🗺️</span> Les signalements sont publics et visibles sur la carte
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default ReportPage
