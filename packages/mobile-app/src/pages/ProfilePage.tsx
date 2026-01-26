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

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {user ? (
          <div>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Name:</strong> {user.firstName} {user.lastName}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            <IonButton expand="block" color="danger" onClick={handleLogout}>
              Logout
            </IonButton>
          </div>
        ) : (
          <p>Loading profile...</p>
        )}
      </IonContent>
    </IonPage>
  )
}

export default ProfilePage
