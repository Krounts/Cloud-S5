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
          '--background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '--color': 'rgba(255,255,255,0.85)',
          '--color-selected': 'white',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: 64
        } as any}>
          <IonTabButton tab="map" href="/map" style={{ '--color-selected': 'white' } as any}>
            <IonIcon icon={map} style={{ fontSize: 24 }} />
            <IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Carte</IonLabel>
          </IonTabButton>
          <IonTabButton tab="profile" href="/profile" style={{ '--color-selected': 'white' } as any}>
            <IonIcon icon={person} style={{ fontSize: 24 }} />
            <IonLabel style={{ fontSize: 11, fontWeight: 600 }}>Profil</IonLabel>
          </IonTabButton>
        </IonTabBar>
      </IonTabs>
    </IonReactRouter>
  )
}

export default AppTabs
