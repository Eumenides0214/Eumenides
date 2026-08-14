<template>
  <div class="app-layout">
    <aside class="sidebar" :class="{ open: mobileMenuOpen }">
      <div class="brand" @click="router.push('/home')">
        <div class="brand-mark">AI</div>
        <div>
          <div class="brand-name">AiChat</div>
          <div class="brand-subtitle">AI Character Play</div>
        </div>
      </div>

      <nav class="nav-list">
        <button
          v-for="item in topNav"
          :key="item.path"
          class="nav-item"
          :class="{ active: activeMenu === item.path }"
          @click="go(item.path)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>

        <button class="create-action" @click="go('/characters/new')">
          <el-icon><Plus /></el-icon>
          <span>创建角色</span>
        </button>
      </nav>

      <div class="sidebar-bottom">
        <button class="nav-item" :class="{ active: activeMenu === '/settings' }" @click="go('/settings')">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </button>
        <el-dropdown @command="handleCommand">
          <div class="sidebar-user">
            <el-avatar :size="36" :src="userStore.user?.avatar">
              {{ userInitial }}
            </el-avatar>
            <div class="user-meta">
              <div class="username">{{ userStore.user?.username || '用户' }}</div>
              <div class="user-status">在线</div>
            </div>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </aside>

    <div v-if="mobileMenuOpen" class="mobile-mask" @click="mobileMenuOpen = false"></div>

    <main class="layout-main">
      <header class="mobile-header">
        <el-button text :icon="Menu" @click="mobileMenuOpen = true" />
        <span>AiChat</span>
      </header>
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { ArrowDown, ChatDotRound, House, Menu, Plus, Setting, Star, User } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const mobileMenuOpen = ref(false);

const topNav = [
  { path: '/home', label: '首页', icon: House },
  { path: '/recent', label: '最近聊天', icon: ChatDotRound },
  { path: '/characters', label: '我的角色', icon: User },
  { path: '/favorites', label: '收藏角色', icon: Star },
];

const userInitial = computed(() => userStore.user?.username?.charAt(0)?.toUpperCase() || 'U');
const activeMenu = computed(() => {
  if (route.path.startsWith('/chat')) return '/recent';
  if (route.path.startsWith('/characters')) return '/characters';
  if (route.path.startsWith('/favorites')) return '/favorites';
  if (route.path.startsWith('/settings')) return '/settings';
  if (route.path.startsWith('/recent')) return '/recent';
  return '/home';
});

function go(path) {
  mobileMenuOpen.value = false;
  router.push(path);
}

function handleCommand(cmd) {
  if (cmd === 'logout') {
    userStore.logout();
    router.push('/login');
  }
}
</script>

<style scoped>
.app-layout {
  height: 100vh;
  display: grid;
  grid-template-columns: 236px 1fr;
  background:
    radial-gradient(circle at 40% 0%, rgba(115, 87, 232, 0.08), transparent 36%),
    var(--page-bg);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.86);
  border-right: 1px solid var(--border);
  backdrop-filter: blur(16px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  cursor: pointer;
}

.brand-mark {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), #9b8cff);
}

.brand-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
}

.brand-subtitle,
.user-status {
  font-size: 12px;
  color: var(--text-secondary);
}

.nav-list,
.sidebar-bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-list {
  flex: 1;
}

.nav-item,
.create-action {
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  transition: background 180ms ease, color 180ms ease;
}

.nav-item:hover {
  color: var(--primary);
  background: var(--primary-soft);
}

.nav-item.active {
  color: var(--primary);
  background: var(--primary-light);
}

.create-action {
  justify-content: center;
  margin-top: 8px;
  color: #fff;
  background: var(--primary);
  font-weight: 700;
}

.create-action:hover {
  background: var(--primary-hover);
}

.sidebar-user {
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  cursor: pointer;
}

.user-meta {
  flex: 1;
  min-width: 0;
}

.username {
  overflow: hidden;
  color: var(--text-primary);
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-main {
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 32px;
}

.mobile-header,
.mobile-mask {
  display: none;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 960px) {
  .app-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 30;
    width: 236px;
    transform: translateX(-100%);
    transition: transform 200ms ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .mobile-mask {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: block;
    background: rgba(32, 34, 42, 0.22);
  }

  .layout-main {
    padding: 16px;
  }

  .mobile-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: -16px -16px 16px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.92);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(16px);
    font-weight: 800;
  }
}
</style>
