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

const ReportPage: React.FC = () => {
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
  const [locationStatus, setLocationStatus] = useState('Obtenir position...')

  // Obtenir la position GPS au chargement
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }))
          setLocationStatus(`Position obtenue: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`)
        },
        (err) => {
          setLocationStatus(`Erreur GPS: ${err.message}`)
          console.error('Geolocation error:', err)
        }
      )
    } else {
      setLocationStatus('Géolocalisation non disponible')
    }
  }, [])

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

    setLoading(true)

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        area_m2: parseFloat(formData.area_m2) || 0,
        budget: parseFloat(formData.budget) || 0,
        company: formData.company.trim(),
        status: formData.status,
        latitude: formData.latitude || -18.8792,
        longitude: formData.longitude || 47.5079,
      }

      console.log('Sending report:', payload)

      // Avec timeout de 10 secondes
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
          setError('Le serveur n\'a pas répondu. Vérifiez que le backend est lancé avec: yarn docker:up')
          return
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
            latitude: formData.latitude,
            longitude: formData.longitude,
          })
          setTimeout(() => setSubmitted(false), 3000)
        } else {
          setError(data.error || 'Erreur du serveur (' + response.status + ')')
        }
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Connexion timeout (10s). Le serveur est peut-être hors ligne.')
      } else {
        setError('Erreur: ' + err.message)
      }
      console.error('Failed to submit report:', err)
    } finally {
      setLoading(false)
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
            <li>La position GPS est capturée automatiquement</li>
            <li>Le titre est obligatoire</li>
            <li>Les signalements sont publics et visibles sur la carte</li>
          </ul>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default ReportPage
