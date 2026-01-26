import { createRouter, createWebHistory } from 'vue-router'
import MapPage from './pages/MapPage.vue'
import ReportPage from './pages/ReportPage.vue'
import ProfilePage from './pages/ProfilePage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/map' },
    { path: '/map', component: MapPage },
    { path: '/report', component: ReportPage },
    { path: '/profile', component: ProfilePage },
  ],
})

export default router
