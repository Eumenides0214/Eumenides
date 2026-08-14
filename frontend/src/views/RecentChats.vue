<template>
  <div class="page-shell recent-page">
    <div class="section-title">
      <div>
        <h2>最近聊天</h2>
        <p class="muted">从上次停下的地方继续。</p>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="5" animated />
    <el-empty v-else-if="!recentChats.length" description="还没有聊天记录" />

    <div v-else class="recent-list">
      <button
        v-for="item in recentChats"
        :key="item.character.id"
        class="recent-card soft-card soft-card-hover"
        @click="$router.push(`/chat/${item.character.id}`)"
      >
        <el-avatar :size="56" :src="item.character.avatar">{{ characterInitial(item.character.name) }}</el-avatar>
        <div class="recent-main">
          <div class="recent-title">
            <strong>{{ item.character.name }}</strong>
            <span>{{ formatTime(item.lastMessage.createdAt) }}</span>
          </div>
          <p>{{ shortText(item.lastMessage.content, 120) }}</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { getCharacters } from '@/api/characters';
import { getMessages } from '@/api/chat';
import { characterInitial, formatTime, shortText } from '@/utils/display';

const loading = ref(true);
const recentChats = ref([]);

async function load() {
  loading.value = true;
  try {
    const res = await getCharacters();
    const characters = res.data || [];
    const pairs = await Promise.all(
      characters.map(async (character) => {
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
.recent-page {
  display: grid;
  gap: 20px;
}

.section-title {
  align-items: flex-end;
}

.section-title p {
  margin: 6px 0 0;
}

.recent-list {
  display: grid;
  gap: 12px;
}

.recent-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.recent-main {
  flex: 1;
  min-width: 0;
}

.recent-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.recent-title strong {
  color: var(--text-primary);
}

.recent-title span,
.recent-main p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}
</style>
