// Service de gestion des notifications pour les changements de statut

export interface Notification {
  id: string
  reportId: number
  reportTitle: string
  oldStatus: string
  newStatus: string
  message: string
  timestamp: string
  read: boolean
  userId?: number
}

const STORAGE_KEY = 'cloud_notifications'
const REPORTS_CACHE_KEY = 'cloud_reports_cache'

const statusLabels: Record<string, string> = {
  new: 'Nouveau',
  in_progress: 'En cours',
  completed: 'Terminé',
  closed: 'Fermé'
}

// Récupérer l'ID de l'utilisateur connecté depuis le token JWT
function getCurrentUserId(): number | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    
    // Décoder le payload JWT (partie 2 du token)
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(atob(parts[1]))
    return payload.id || null
  } catch {
    return null
  }
}

class NotificationService {
  private listeners: Array<(notifications: Notification[]) => void> = []

  // Charger les notifications depuis localStorage
  getNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const all = stored ? JSON.parse(stored) : []
      
      // Filtrer par utilisateur connecté
      const currentUserId = getCurrentUserId()
      if (currentUserId) {
        // Si connecté, ne montrer que les notifications de cet utilisateur
        return all.filter((n: Notification) => n.userId === currentUserId || !n.userId)
      }
      
      // Si non connecté, montrer toutes les notifications (mode anonyme)
      return all
    } catch {
      return []
    }
  }

  // Charger toutes les notifications (sans filtre)
  getAllNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  // Sauvegarder les notifications (garde toutes les notifications de tous les users)
  private saveNotifications(notifications: Notification[]): void {
    // Combiner avec les notifications existantes des autres utilisateurs
    const allNotifications = this.getAllNotifications()
    const currentUserId = getCurrentUserId()
    
    // Garder les notifications des autres utilisateurs
    const otherUserNotifs = currentUserId 
      ? allNotifications.filter((n: Notification) => n.userId && n.userId !== currentUserId)
      : []
    
    // Combiner et sauvegarder
    const combined = [...notifications, ...otherUserNotifs].slice(0, 100)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined))
    
    // Notifier les listeners avec seulement les notifications de l'utilisateur actuel
    this.notifyListeners(notifications)
  }

  // Ajouter une notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const notifications = this.getNotifications()
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      userId: notification.userId
    }
    notifications.unshift(newNotification)
    // Garder seulement les 50 dernières notifications
    this.saveNotifications(notifications.slice(0, 50))
  }

  // Marquer une notification comme lue
  markAsRead(notificationId: string): void {
    const notifications = this.getNotifications()
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    )
    this.saveNotifications(updated)
  }

  // Marquer toutes comme lues
  markAllAsRead(): void {
    const notifications = this.getNotifications()
    const updated = notifications.map(n => ({ ...n, read: true }))
    this.saveNotifications(updated)
  }

  // Compter les non lues
  getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.read).length
  }

  // Supprimer une notification
  deleteNotification(notificationId: string): void {
    const notifications = this.getNotifications()
    this.saveNotifications(notifications.filter(n => n.id !== notificationId))
  }

  // Effacer toutes les notifications
  clearAll(): void {
    this.saveNotifications([])
  }

  // Obtenir le cache des reports pour détecter les changements
  private getReportsCache(): Record<number, string> {
    try {
      const stored = localStorage.getItem(REPORTS_CACHE_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  // Sauvegarder le cache des reports
  private saveReportsCache(cache: Record<number, string>): void {
    localStorage.setItem(REPORTS_CACHE_KEY, JSON.stringify(cache))
  }

  // Vérifier les changements de statut et créer des notifications
  // Ne crée des notifications que pour les signalements de l'utilisateur connecté
  checkForStatusChanges(reports: Array<{ id: number; title: string; status: string; user_id?: number }>): void {
    const currentUserId = getCurrentUserId()
    const cache = this.getReportsCache()
    const newCache: Record<number, string> = {}
    
    for (const report of reports) {
      const oldStatus = cache[report.id]
      newCache[report.id] = report.status
      
      // Si on a un ancien statut et qu'il a changé
      if (oldStatus && oldStatus !== report.status) {
        // Ne notifier que si c'est un signalement de l'utilisateur connecté
        // ou si l'utilisateur n'est pas connecté (notifier tous)
        const isUserReport = !currentUserId || report.user_id === currentUserId
        
        if (isUserReport) {
          this.addNotification({
            reportId: report.id,
            reportTitle: report.title,
            oldStatus: oldStatus,
            newStatus: report.status,
            message: `Le signalement "${report.title}" est passé de "${statusLabels[oldStatus] || oldStatus}" à "${statusLabels[report.status] || report.status}"`,
            userId: report.user_id
          })
        }
      }
    }
    
    this.saveReportsCache(newCache)
  }

  // S'abonner aux changements
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(notifications: Notification[]): void {
    this.listeners.forEach(listener => listener(notifications))
  }
}

export const notificationService = new NotificationService()
