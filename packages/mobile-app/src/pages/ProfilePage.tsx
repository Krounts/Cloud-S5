import React, { useState, useEffect } from 'react'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/react'

interface UserProfile {
  id: number
  email: string
  firstName: string
  lastName: string
  role: string
}

const API_BASE = 'http://localhost:3001'

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

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

      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setShowLogin(false)
      } else {
        localStorage.removeItem('token')
        setError('Session expirée ou invalide')
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setError('Impossible de charger le profil')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Connexion échouée')
      }

      // Sauvegarder le token
      localStorage.setItem('token', data.token)
      
      // Mettre à jour l'utilisateur
      setUser(data.user)
      setShowLogin(false)
      setError('')
      setLoginForm({ email: '', password: '' })
    } catch (err: any) {
      setLoginError(err.message || 'Erreur de connexion')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setError('Non connecté')
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ 
          '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '--color': 'white'
        } as any}>
          <IonTitle style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
            👤 Mon Profil
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--background': 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' } as any}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16
          }}>
            <div style={{
              width: 50,
              height: 50,
              border: '4px solid #e2e8f0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#64748b', fontSize: 16 }}>Chargement du profil...</p>
          </div>
        ) : user ? (
          /* Utilisateur connecté */
          <div style={{ padding: '20px' }}>
            {/* Header avec avatar */}
            <div style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '24px 20px',
              borderRadius: 16,
              marginBottom: 20,
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
            }}>
              <div style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: 32,
                backdropFilter: 'blur(10px)'
              }}>
                {user.role === 'manager' ? '👔' : '👤'}
              </div>
              <h2 style={{ color: 'white', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
                {user.firstName} {user.lastName}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: 14 }}>
                ✓ Connecté
              </p>
            </div>

            {/* Carte d'informations */}
            <div style={{ 
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              marginBottom: 20
            }}>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 16,
                marginBottom: 16,
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: 24 }}>📧</span>
                <div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', margin: 0 }}>{user.email}</p>
                </div>
              </div>

              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingBottom: 16,
                marginBottom: 16,
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: 24 }}>🏷️</span>
                <div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rôle</p>
                  <span style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    background: user.role === 'manager' 
                      ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' 
                      : 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                    color: 'white',
                    boxShadow: user.role === 'manager' 
                      ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                      : '0 2px 8px rgba(100, 116, 139, 0.3)'
                  }}>
                    {user.role === 'manager' ? '👔 Manager' : '👤 Utilisateur'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🔒</span>
                <div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#10b981', margin: 0 }}>Compte actif</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              🚪 Déconnexion
            </button>
          </div>
        ) : showLogin ? (
          /* Formulaire de connexion */
          <div style={{ padding: '20px' }}>
            {/* Header du formulaire */}
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '28px 20px',
              borderRadius: 16,
              marginBottom: 24,
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: 28,
                backdropFilter: 'blur(10px)'
              }}>
                🔐
              </div>
              <h2 style={{ margin: 0, color: 'white', fontSize: 22, fontWeight: 700 }}>Connexion</h2>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                Accédez à votre compte
              </p>
            </div>

            {loginError && (
              <div style={{ 
                padding: 14,
                marginBottom: 20,
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: 12,
                border: '1px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                <span style={{ fontSize: 20 }}>❌</span>
                <p style={{ color: '#dc2626', margin: 0, fontSize: 14, fontWeight: 500 }}>{loginError}</p>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#475569'
                }}>
                  📧 Email
                </label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="votre@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '2px solid #e2e8f0',
                    fontSize: 16,
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea'
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#475569'
                }}>
                  🔑 Mot de passe
                </label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 12,
                    border: '2px solid #e2e8f0',
                    fontSize: 16,
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea'
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 12,
                  border: 'none',
                  background: loginLoading 
                    ? '#94a3b8' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: loginLoading ? 'not-allowed' : 'pointer',
                  marginBottom: 12,
                  boxShadow: loginLoading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loginLoading ? '⏳ Connexion en cours...' : '🔓 Se connecter'}
              </button>

              <button
                type="button"
                onClick={() => setShowLogin(false)}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 12,
                  border: '2px solid #e2e8f0',
                  backgroundColor: 'white',
                  color: '#64748b',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                ← Retour
              </button>
            </form>

            <p style={{ 
              fontSize: 13,
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: 24,
              padding: '0 10px'
            }}>
              💡 Contactez votre manager si vous n'avez pas de compte
            </p>
          </div>
        ) : (
          /* Mode non connecté */
          <div style={{ padding: '20px' }}>
            {/* Header non connecté */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '24px 20px',
              borderRadius: 16,
              marginBottom: 20,
              textAlign: 'center',
              boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: 28,
                backdropFilter: 'blur(10px)'
              }}>
                👋
              </div>
              <h2 style={{ color: 'white', margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>
                Bienvenue !
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: 14 }}>
                Mode utilisateur anonyme
              </p>
            </div>
            
            {/* Carte des fonctionnalités */}
            <div style={{ 
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 16,
              marginBottom: 20,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
            }}>
              <h3 style={{ 
                fontSize: 17,
                marginBottom: 16,
                color: '#1e293b',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                ✨ Ce que vous pouvez faire
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderRadius: 10
                }}>
                  <span style={{ fontSize: 22 }}>📍</span>
                  <span style={{ fontSize: 14, color: '#166534', fontWeight: 500 }}>Consulter la carte des signalements</span>
                </div>
                
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: 10
                }}>
                  <span style={{ fontSize: 22 }}>🚧</span>
                  <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>Créer de nouveaux signalements</span>
                </div>
                
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                  borderRadius: 10
                }}>
                  <span style={{ fontSize: 22 }}>📊</span>
                  <span style={{ fontSize: 14, color: '#5b21b6', fontWeight: 500 }}>Voir les statistiques publiques</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowLogin(true)}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              🔐 Se connecter
            </button>

            <p style={{ 
              fontSize: 13,
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: 20,
              padding: '0 10px'
            }}>
              🔒 Connectez-vous pour accéder à votre historique et gérer vos signalements
            </p>
          </div>
        )}
      </IonContent>
    </IonPage>
  )
}

export default ProfilePage
