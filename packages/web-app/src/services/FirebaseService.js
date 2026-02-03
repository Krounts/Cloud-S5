// Firebase Firestore Service for Cloud S5 Web App
// Configuration: cloud-s5-antananarivo project

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cloud-s5-antananarivo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cloud-s5-antananarivo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cloud-s5-antananarivo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

class FirebaseService {
  constructor() {
    this.firestore = null
    this.db = null
  }

  async initialize() {
    try {
      const { initializeApp } = await import('firebase/app')
      const { getFirestore } = await import('firebase/firestore')
      
      const app = initializeApp(firebaseConfig)
      this.firestore = app
      this.db = getFirestore(app)
      console.log('Firebase initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Firebase:', error)
    }
  }

  isInitialized() {
    return this.db !== null
  }

  /**
   * Fetch reports from Firestore
   */
  async fetchReports() {
    if (!this.db) {
      console.warn('Firebase not initialized')
      return []
    }

    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const reportsRef = collection(this.db, 'reports')
      const snapshot = await getDocs(reportsRef)
      
      const reports = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        reports.push({
          id: doc.id,
          title: data.title || 'Sans titre',
          description: data.description || '',
          latitude: parseFloat(data.latitude || data.lat || 0),
          longitude: parseFloat(data.longitude || data.lng || 0),
          status: data.status || 'new',
          area_m2: parseFloat(data.area_m2 || data.area || 0),
          budget: parseFloat(data.budget || 0),
          company: data.company || data.contractor || 'Non renseigné',
          created_at: data.createdAt || data.created_at || new Date().toISOString(),
          syncedToFirebase: true,
        })
      })
      
      return reports
    } catch (error) {
      console.error('Error fetching reports from Firebase:', error)
      return []
    }
  }

  /**
   * Save a new report to Firestore
   */
  async saveReport(report) {
    if (!this.db) {
      throw new Error('Firebase not initialized')
    }

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore')
      const reportsRef = collection(this.db, 'reports')
      
      const docRef = await addDoc(reportsRef, {
        ...report,
        createdAt: serverTimestamp(),
        syncedToFirebase: true,
      })
      
      console.log('Report saved to Firebase:', docRef.id)
      return { id: docRef.id, ...report }
    } catch (error) {
      console.error('Error saving report to Firebase:', error)
      throw error
    }
  }

  /**
   * Update a report in Firestore
   */
  async updateReport(reportId, updates) {
    if (!this.db) {
      throw new Error('Firebase not initialized')
    }

    try {
      const { doc, updateDoc } = await import('firebase/firestore')
      const reportRef = doc(this.db, 'reports', reportId)
      
      await updateDoc(reportRef, updates)
      console.log('Report updated in Firebase:', reportId)
    } catch (error) {
      console.error('Error updating report in Firebase:', error)
      throw error
    }
  }
}

export default new FirebaseService()
