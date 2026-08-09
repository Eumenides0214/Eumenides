<template>
  <div class="page">
    <div class="page-header">
      <h2>我的角色</h2>
      <el-button type="primary" :icon="Plus" @click="$router.push('/characters/new')">创建角色</el-button>
    </div>

    <div v-if="loading" class="loading">
      <el-skeleton :rows="3" animated />
    </div>

    <el-empty v-else-if="!characters.length" description="还没有创建角色，快去创建一个吧！" />

    <div v-else class="character-grid">
      <el-card
        v-for="char in characters"
        :key="char.id"
        class="character-card"
        shadow="hover"
        @click="$router.push(`/chat/${char.id}`)"
      >
        <div class="card-avatar">
          <el-avatar :size="80" :src="char.avatar">
            {{ char.name?.charAt(0) }}
          </el-avatar>
        </div>
        <div class="card-name">{{ char.name }}</div>
        <div class="card-info">
          {{ char.gender === 'male' ? '男' : char.gender === 'female' ? '女' : '其他' }} · {{ char.age }}岁
        </div>
        <div class="card-tags">
          <el-tag v-for="tag in (char.tags || []).slice(0, 3)" :key="tag" size="small" type="info" effect="plain">
            {{ tag }}
          </el-tag>
        </div>
        <div class="card-actions" @click.stop>
          <el-button size="small" :icon="ChatDotRound" type="primary" @click="$router.push(`/chat/${char.id}`)">聊天</el-button>
          <el-button size="small" :icon="Edit" @click="$router.push(`/characters/${char.id}/edit`)">编辑</el-button>
          <el-popconfirm title="确定删除该角色吗？" @confirm="handleDelete(char.id)">
            <template #reference>
              <el-button size="small" type="danger" :icon="Delete" plain>删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Edit, Delete, ChatDotRound } from '@element-plus/icons-vue';
import { getCharacters, deleteCharacter } from '@/api/characters';

const router = useRouter();
const loading = ref(true);
const characters = ref([]);

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
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 22px;
  color: #303133;
}
.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}
.character-card {
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s;
}
.character-card:hover {
  transform: translateY(-4px);
}
.card-avatar {
  margin-bottom: 12px;
}
.card-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}
.card-info {
  color: #909399;
  font-size: 13px;
  margin-bottom: 8px;
}
.card-tags {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.card-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.loading {
  max-width: 600px;
  margin: 0 auto;
}
</style>
