import { createRouter, createWebHistory } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'
import HomeView from '../views/HomeView.vue'
import CampaignsListView from '../views/CampaignsListView.vue'
import CampaignCreateView from '../views/CampaignCreateView.vue'
import CampaignDetailView from '../views/CampaignDetailView.vue'
import CampaignDispatchView from '../views/CampaignDispatchView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: BaseLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
        },
        {
          path: 'campaigns',
          name: 'campaigns',
          component: CampaignsListView,
        },
        {
          path: 'campaigns/create',
          name: 'campaigns-create',
          component: CampaignCreateView,
        },
        {
          path: 'campaigns/:id',
          name: 'campaigns-detail',
          component: CampaignDetailView,
        },
        {
          path: 'campaigns/:id/dispatch',
          name: 'campaigns-dispatch',
          component: CampaignDispatchView,
        },
      ],
    },
  ],
})

export default router
