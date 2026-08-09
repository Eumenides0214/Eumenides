import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('@/views/Register.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/characters' },
      { path: 'characters', name: 'Characters', component: () => import('@/views/CharacterList.vue') },
      { path: 'characters/new', name: 'CharacterCreate', component: () => import('@/views/CharacterForm.vue') },
      { path: 'characters/:id/edit', name: 'CharacterEdit', component: () => import('@/views/CharacterForm.vue'), props: true },
      { path: 'chat/:id', name: 'Chat', component: () => import('@/views/Chat.vue'), props: true },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } });
  } else if ((to.path === '/login' || to.path === '/register') && token) {
    next('/');
  } else {
    next();
  }
});

export default router;
