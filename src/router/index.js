import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AnalysisView from '../views/AnalysisView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/analysis',
      name: 'analysis',
      component: AnalysisView,
      meta: { requiresAuth: true }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const isLoggedIn = localStorage.getItem('isLoggedIn');  // 从 localStorage 获取登录状态
    if (isLoggedIn) {
      next();  // 用户已登录，继续访问
    } else {
      next('/');  // 用户未登录，重定向到登录页
    }
  } else {
    next();  // 对于不需要登录的页面，直接放行
  }
})

export default router 