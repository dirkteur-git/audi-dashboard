import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './pages/Dashboard.vue'
import Trips from './pages/Trips.vue'
import Settings from './pages/Settings.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Dashboard },
    { path: '/trips', component: Trips },
    { path: '/settings', component: Settings }
  ]
})
