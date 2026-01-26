import React from 'react'
import { IonApp, setupIonicReact } from '@ionic/react'

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/display.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

/* Theme variables */
import './theme/variables.css'

import AppTabs from './pages/AppTabs'

setupIonicReact()

const App: React.FC = () => (
  <IonApp>
    <AppTabs />
  </IonApp>
)

export default App
