<template>
  <div class="page-shell home-page">
    <section class="hero-panel">
      <div>
        <p class="eyebrow">{{ greeting }}，{{ userStore.user?.username || '朋友' }}</p>
        <h1>今天想和谁聊天呢？</h1>
        <p>选择一个角色，继续一段轻松自然的 AI 陪伴对话。</p>
      </div>
      <el-input
        v-model="keyword"
        class="hero-search"
        :prefix-icon="Search"
        placeholder="搜索角色"
        clearable
      />
    </section>

    <section class="section">
      <div class="section-title">
        <h2>我的角色</h2>
        <el-button text @click="$router.push('/characters')">全部角色</el-button>
      </div>

      <div v-if="loading" class="home-grid">
        <el-skeleton v-for="i in 3" :key="i" animated />
      </div>
      <div v-else class="home-grid">
        <article
          v-for="char in filteredCharacters.slice(0, 5)"
          :key="char.id"
          class="mini-character soft-card soft-card-hover"
          @click="$router.push(`/chat/${char.id}`)"
        >
          <el-avatar :size="64" :src="char.avatar">{{ characterInitial(char.name) }}</el-avatar>
          <div class="mini-name">{{ char.name }}</div>
          <div class="mini-meta">{{ genderText(char.gender) }} · {{ char.age }}岁</div>
        </article>

        <article class="mini-character create-card soft-card soft-card-hover" @click="$router.push('/characters/new')">
          <div class="plus-mark">+</div>
          <div class="mini-name">创建角色</div>
          <div class="mini-meta">设计新的陪伴者</div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-title">
        <h2>最近聊天</h2>
        <el-button text @click="$router.push('/recent')">查看全部</el-button>
      </div>

      <el-empty v-if="!recentChats.length && !loading" description="还没有聊天记录" />
      <div v-else class="recent-list">
        <button
          v-for="item in recentChats.slice(0, 4)"
          :key="item.character.id"
          class="recent-item soft-card soft-card-hover"
          @click="$router.push(`/chat/${item.character.id}`)"
        >
          <el-avatar :size="48" :src="item.character.avatar">{{ characterInitial(item.character.name) }}</el-avatar>
          <div class="recent-content">
            <div class="recent-top">
              <strong>{{ item.character.name }}</strong>
              <span>{{ formatTime(item.lastMessage?.createdAt) }}</span>
            </div>
            <p>{{ shortText(item.lastMessage?.content || '开始新的聊天', 64) }}</p>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getCharacters } from '@/api/characters';
import { getMessages } from '@/api/chat';
import { characterInitial, formatTime, genderText, shortText } from '@/utils/display';

const userStore = useUserStore();
const loading = ref(true);
const keyword = ref('');
const characters = ref([]);
const recentChats = ref([]);

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const filteredCharacters = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return characters.value;
  return characters.value.filter((char) => {
    const tags = (char.tags || []).join(' ');
    return `${char.name} ${char.description} ${tags}`.toLowerCase().includes(q);
  });
});

async function load() {
  loading.value = true;
  try {
    const res = await getCharacters();
    characters.value = res.data || [];
    const pairs = await Promise.all(
      characters.value.map(async (character) => {
        try {
          const msgRes = await getMessages(character.id);
          const messages = msgRes.data || [];
          return { character, lastMessage: messages[messages.length - 1] };
        } catch {
          return { character, lastMessage: null };
        }
      })
    );
    recentChats.value = pairs
      .filter((item) => item.lastMessage)
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero-panel {
  display: grid;
  grid-template-columns: 1fr minmax(240px, 360px);
  align-items: center;
  gap: 24px;
  padding: 32px;
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 78% 20%, rgba(255, 255, 255, 0.7), transparent 28%),
    linear-gradient(135deg, rgba(115, 87, 232, 0.16), rgba(255, 255, 255, 0.92));
  border: 1px solid rgba(115, 87, 232, 0.14);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary);
  font-weight: 800;
}

.hero-panel h1 {
  margin: 0 0 8px;
  font-size: 34px;
  letter-spacing: 0;
}

.hero-panel p {
  color: var(--text-secondary);
}

.hero-search {
  max-width: 360px;
}

.section {
  min-width: 0;
}

.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.mini-character {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border: 0;
  cursor: pointer;
}

.mini-name {
  color: var(--text-primary);
  font-weight: 800;
}

.mini-meta {
  color: var(--text-secondary);
  font-size: 13px;
}

.plus-mark {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 32px;
  font-weight: 700;
}

.recent-list {
  display: grid;
  gap: 12px;
}

.recent-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.recent-content {
  flex: 1;
  min-width: 0;
}

.recent-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-primary);
}

.recent-top span,
.recent-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

@media (max-width: 768px) {
  .hero-panel {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .hero-panel h1 {
    font-size: 28px;
  }
}
</style>
