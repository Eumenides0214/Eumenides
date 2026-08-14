<template>
  <div class="page-shell character-page">
    <div class="page-hero">
      <div>
        <p class="eyebrow">My Characters</p>
        <h1>我的角色</h1>
        <p>管理你的 AI 角色，快速开始文字或语音互动。</p>
      </div>
      <div class="hero-actions">
        <el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索角色、标签或描述" clearable />
        <el-button type="primary" :icon="Plus" @click="$router.push('/characters/new')">创建角色</el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!characters.length" description="还没有创建角色">
      <el-button type="primary" :icon="Plus" @click="$router.push('/characters/new')">创建第一个角色</el-button>
    </el-empty>

    <div v-else class="character-grid">
      <CharacterCard
        v-for="char in filteredCharacters"
        :key="char.id"
        :character="char"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, Search } from '@element-plus/icons-vue';
import CharacterCard from '@/components/character/CharacterCard.vue';
import { deleteCharacter, getCharacters } from '@/api/characters';

const loading = ref(true);
const keyword = ref('');
const characters = ref([]);

const filteredCharacters = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  if (!q) return characters.value;
  return characters.value.filter((char) => {
    const tags = (char.tags || []).join(' ');
    return `${char.name} ${char.description} ${tags} ${char.voiceType}`.toLowerCase().includes(q);
  });
});

async function load() {
  loading.value = true;
  try {
    const res = await getCharacters();
    characters.value = res.data || [];
  } catch {} finally {
    loading.value = false;
  }
}

async function handleDelete(id) {
  try {
    await deleteCharacter(id);
    ElMessage.success('删除成功');
    load();
  } catch {}
}

onMounted(load);
</script>

<style scoped>
.character-page {
  display: grid;
  gap: 24px;
}

.page-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  padding: 28px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(115, 87, 232, 0.14), rgba(255, 255, 255, 0.92));
  border: 1px solid rgba(115, 87, 232, 0.14);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--primary);
  font-weight: 800;
}

.page-hero h1 {
  margin: 0 0 8px;
  font-size: 32px;
}

.page-hero p {
  margin: 0;
  color: var(--text-secondary);
}

.hero-actions {
  min-width: min(420px, 100%);
  display: flex;
  gap: 12px;
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .page-hero {
    align-items: stretch;
    flex-direction: column;
    padding: 24px;
  }

  .hero-actions {
    flex-direction: column;
  }
}
</style>
