import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AnalysisView from '../views/AnalysisView.vue'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/services/api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/analysis',
      name: 'analysis',
      component: AnalysisView,
      meta: { requiresAuth: true }
    },
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  
  // 如果路由需要认证
  if (to.meta.requiresAuth) {
    // 检查是否有token
    if (userStore.token) {
      // 验证token有效性
      const isValid = await authApi.validateToken();
      if (isValid) {
        next(); // token有效，允许访问
      } else {
        // token无效，清除用户数据并重定向到登录页
        userStore.clearUserData();
        next('/');
      }
    } else {
      // 没有token，重定向到登录页
      next('/');
    }
  } 
  // 如果路由是仅限游客访问的（如登录页）
  else if (to.meta.requiresGuest && userStore.token) {
    // 已登录用户访问登录页，重定向到主页
    next('/analysis');
  } 
  else {
    // 其他情况，直接放行
    next();
  }
})

export default router 