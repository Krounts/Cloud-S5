import React from 'react'
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route, Redirect } from 'react-router-dom'
import { map, person } from 'ionicons/icons'

import MapPage from './MapPage'
import ReportPage from './ReportPage'
import ProfilePage from './ProfilePage'

const AppTabs: React.FC = () => {
  return (
    <IonReactRouter>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/" render={() => <Redirect to="/map" />} />
          <Route exact path="/map" component={MapPage} />
          <Route exact path="/report" component={ReportPage} />
          <Route exact path="/profile" component={ProfilePage} />
        </IonRouterOutlet>
        <IonTabBar slot="bottom" style={{ 
          '--background': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          '--color': '#94a3b8',
          '--color-selected': '#667eea',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 60
        } as any}>
          <IonTabButton tab="map" href="/map" style={{ '--color-selected': '#667eea' } as any}>
            <IonIcon icon={map} style={{ fontSize: 24 }} />
            <IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Carte</IonLabel>
          </IonTabButton>
          <IonTabButton tab="profile" href="/profile" style={{ '--color-selected': '#10b981' } as any}>
            <IonIcon icon={person} style={{ fontSize: 24 }} />
            <IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Profil</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  )
}

export default AppTabs
