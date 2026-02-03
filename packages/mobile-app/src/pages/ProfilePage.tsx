import React, { useState, useEffect } from 'react'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/react'

interface UserProfile {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
}

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        setError('Non connecté')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setError('Session expirée ou invalide')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setError('Impossible de charger le profil')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.reload()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p>Chargement du profil...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '20px' }}>
            <div style={{ padding: 16, marginBottom: 20, backgroundColor: '#fff4e6', borderRadius: 8, border: '1px solid #f59e0b' }}>
              <p style={{ color: '#92400e', marginBottom: 12 }}>⚠️ {error}</p>
            </div>
            
            <div style={{ backgroundColor: '#f9fafb', padding: 20, borderRadius: 8, marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, marginBottom: 12, color: '#1f2937' }}>Mode utilisateur anonyme</h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                Vous pouvez utiliser l'application pour consulter la carte et signaler des problèmes sans connexion.
              </p>
              <ul style={{ fontSize: 14, color: '#6b7280', paddingLeft: 20 }}>
                <li>📍 Consulter la carte des signalements</li>
                <li>🚧 Créer de nouveaux signalements</li>
                <li>📊 Voir les statistiques publiques</li>
              </ul>
            </div>

            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
              Connectez-vous pour accéder à votre historique et gérer vos signalements
            </p>
          </div>
        ) : user ? (
          <div style={{ padding: '20px' }}>
            <div style={{ backgroundColor: '#f0fdf4', padding: 20, borderRadius: 8, marginBottom: 20, border: '1px solid #86efac' }}>
              <p style={{ color: '#15803d', marginBottom: 4, fontSize: 14 }}>✓ Connecté</p>
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Email</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>{user.email}</p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Nom complet</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
                  {user.firstName} {user.lastName}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Rôle</p>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: user.role === 'manager' ? '#dbeafe' : '#f3f4f6',
                  color: user.role === 'manager' ? '#1e40af' : '#374151'
                }}>
                  {user.role === 'manager' ? '👔 Manager' : '👤 Utilisateur'}
                </span>
              </div>
            </div>

            <IonButton expand="block" color="danger" onClick={handleLogout}>
              🚪 Déconnexion
            </IonButton>
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  )
}

export default ProfilePage
