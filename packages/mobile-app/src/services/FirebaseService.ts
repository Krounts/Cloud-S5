// Firebase Firestore Service for Cloud S5 Mobile App
// Configuration: cloud-s5-antananarivo project

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// This config should be loaded from environment variables
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'cloud-s5-antananarivo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'cloud-s5-antananarivo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'cloud-s5-antananarivo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export interface ReportData {
  id?: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  status: 'new' | 'in_progress' | 'completed' | 'closed';
  area_m2?: number;
  budget?: number;
  company?: string;
  createdAt?: string;
  syncedToFirebase?: boolean;
}

class FirebaseService {
  private firestore: any = null;
  private db: any = null;

  async initialize(): Promise<void> {
    // Initialize Firebase when SDK is available
    // This is called dynamically when Firebase SDK is loaded
    try {
      const { initializeApp } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      
      const app = initializeApp(firebaseConfig);
      this.firestore = app;
      this.db = getFirestore(app);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      // Continue without Firebase - offline mode
    }
  }

  /**
   * Fetch reports from Firestore
   */
  async fetchReports(): Promise<ReportData[]> {
    if (!this.db) {
      console.warn('Firebase not initialized');
      return [];
    }

    try {
      const { collection, getDocs } = await import('firebase/firestore');
      const reportsRef = collection(this.db, 'reports');
      const snapshot = await getDocs(reportsRef);
      
      const reports: ReportData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        reports.push({
          id: doc.id,
          title: data.title || 'Sans titre',
          description: data.description || '',
          latitude: parseFloat(data.latitude || data.lat || 0),
          longitude: parseFloat(data.longitude || data.lng || 0),
          status: data.status || 'new',
          area_m2: parseFloat(data.area_m2 || data.area || 0),
          budget: parseFloat(data.budget || 0),
          company: data.company || 'Non renseigné',
          createdAt: data.createdAt || new Date().toISOString(),
          syncedToFirebase: true,
        });
      });

      return reports;
    } catch (error) {
      console.error('Error fetching reports from Firestore:', error);
      return [];
    }
  }

  /**
   * Save report to Firestore
   */
  async saveReport(report: ReportData): Promise<boolean> {
    if (!this.db) {
      console.warn('Firebase not initialized');
      return false;
    }

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const reportsRef = collection(this.db, 'reports');
      
      const docData = {
        title: report.title,
        description: report.description,
        latitude: report.latitude,
        longitude: report.longitude,
        status: report.status || 'new',
        area_m2: report.area_m2 || 0,
        budget: report.budget || 0,
        company: report.company || 'Non renseigné',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(reportsRef, docData);
      console.log('Report saved to Firestore with ID:', docRef.id);
      return true;
    } catch (error) {
      console.error('Error saving report to Firestore:', error);
      return false;
    }
  }

  /**
   * Sync local reports to Firestore
   */
  async syncLocalReports(localReports: ReportData[]): Promise<number> {
    let synced = 0;

    for (const report of localReports) {
      // Only sync reports that haven't been synced yet
      if (!report.syncedToFirebase && report.latitude && report.longitude) {
        const success = await this.saveReport(report);
        if (success) {
          synced++;
          // Mark as synced in local storage
          // (implementation depends on your local storage strategy)
        }
      }
    }

    console.log(`Synced ${synced} reports to Firebase`);
    return synced;
  }

  /**
   * Get Firebase initialization status
   */
  isInitialized(): boolean {
    return !!this.db;
  }
}

export default new FirebaseService();
