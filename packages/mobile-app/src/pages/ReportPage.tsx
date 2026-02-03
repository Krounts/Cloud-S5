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
    budget: '',
    company: '',
    status: 'new',
    latitude: 0,
    longitude: 0,
  })

  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [locationStatus, setLocationStatus] = useState('Sélectionnez une position sur la carte')

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
        budget: parseFloat(formData.budget) || 0,
        company: formData.company.trim(),
        status: formData.status,
        latitude: formData.latitude,
        longitude: formData.longitude,
      }

      console.log('Sending report:', payload)

      // Détecter si on est en ligne ou hors ligne
      const isOnline = navigator.onLine

      if (isOnline) {
        // MODE EN LIGNE : Envoyer à Firebase
        try {
          if (!FirebaseService.isInitialized()) {
            await FirebaseService.initialize()
          }
          
          const firebaseResult = await FirebaseService.saveReport(payload)
          console.log('Report saved to Firebase (online mode):', firebaseResult)
          
          setSubmitted(true)
          setFormData({
            title: '',
            description: '',
            area_m2: '',
            budget: '',
            company: '',
            status: 'new',
            latitude: formData.latitude,
            longitude: formData.longitude,
          })
          setTimeout(() => setSubmitted(false), 3000)
        } catch (firebaseError: any) {
          console.error('Firebase failed, falling back to local:', firebaseError)
          setError('Erreur Firebase. Utilisation du mode local. ' + firebaseError.message)
          // Fallback vers PostgreSQL si Firebase échoue
          await submitToPostgreSQL(payload)
        }
      } else {
        // MODE HORS LIGNE : Envoyer à PostgreSQL local
        console.log('Offline mode: using local PostgreSQL')
        await submitToPostgreSQL(payload)
      }
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

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      const data = JSON.parse(text)

      if (response.ok) {
        setSubmitted(true)
        setFormData({
          title: '',
          description: '',
          area_m2: '',
          budget: '',
          company: '',
          status: 'new',
          latitude: payload.latitude,
          longitude: payload.longitude,
        })
        setTimeout(() => setSubmitted(false), 3000)
      } else {
        throw new Error(data.error || 'Erreur du serveur (' + response.status + ')')
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Signaler un problème</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {submitted && (
          <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#d1fae5', borderRadius: 8, color: '#065f46' }}>
            ✓ Signalement envoyé avec succès!
          </div>
        )}

        {error && (
          <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#fee2e2', borderRadius: 8, color: '#991b1b' }}>
            ✗ {error}
          </div>
        )}

        <div style={{ padding: 12, marginBottom: 16, backgroundColor: '#eff6ff', borderRadius: 8, color: '#1e40af', fontSize: 12 }}>
          📍 {locationStatus}
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

        <IonItem>
          <IonLabel position="floating">Budget estimé (MGA)</IonLabel>
          <IonInput name="budget" type="number" value={formData.budget} onIonChange={handleInputChange} placeholder="0" />
        </IonItem>

        <IonItem>
          <IonLabel position="floating">Entreprise responsable</IonLabel>
          <IonInput name="company" value={formData.company} onIonChange={handleInputChange} placeholder="Ex: SOGEA Tana" />
        </IonItem>

        <IonItem>
          <IonLabel>Statut</IonLabel>
          <IonSelect value={formData.status} onIonChange={(e) => handleSelectChange(e.detail.value)}>
            <IonSelectOption value="new">Nouveau</IonSelectOption>
            <IonSelectOption value="in_progress">En cours</IonSelectOption>
            <IonSelectOption value="completed">Terminé</IonSelectOption>
          </IonSelect>
        </IonItem>

        <div style={{ marginTop: 24 }}>
          <IonButton expand="block" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <IonSpinner name="crescent" style={{ marginRight: 8 }} />
                Envoi en cours...
              </>
            ) : (
              'Envoyer le signalement'
            )}
          </IonButton>
        </div>

        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8, fontSize: 12, color: '#6b7280' }}>
          <strong>Notes:</strong>
          <ul>
            <li>Sélectionnez la position en cliquant sur la carte</li>
            <li>Le titre est obligatoire</li>
            <li>Les signalements sont publics et visibles sur la carte</li>
          </ul>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default ReportPage
