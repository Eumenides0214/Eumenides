<template>
  <div class="page-shell detail-page">
    <el-button text :icon="ArrowLeft" @click="$router.back()">返回</el-button>

    <el-skeleton v-if="loading" animated :rows="8" />
    <section v-else class="detail-grid">
      <div class="portrait soft-card">
        <el-avatar :size="160" :src="character.avatar">{{ characterInitial(character.name) }}</el-avatar>
        <span class="online">在线</span>
      </div>

      <div class="detail-main soft-card">
        <div class="detail-header">
          <div>
            <h1>{{ character.name }}</h1>
            <p>{{ genderText(character.gender) }} · {{ character.age }}岁 · {{ character.voiceType }}</p>
          </div>
          <div class="detail-actions">
            <el-button @click="$router.push(`/characters/${character.id}/edit`)">编辑</el-button>
            <el-button type="primary" @click="$router.push(`/chat/${character.id}`)">开始聊天</el-button>
          </div>
        </div>

        <div class="tags">
          <el-tag v-for="tag in character.tags || []" :key="tag" effect="plain">{{ tag }}</el-tag>
        </div>

        <section>
          <h3>角色简介</h3>
          <p>{{ character.description }}</p>
        </section>

        <section class="voice-panel">
          <div>
            <h3>声音</h3>
            <p>{{ character.voiceType }}</p>
          </div>
          <el-button :icon="Headset" :loading="previewing" @click="previewVoice">试听</el-button>
        </section>
      </div>
    </section>

    <audio ref="previewAudioRef"></audio>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ArrowLeft, Headset } from '@element-plus/icons-vue';
import { useRoute } from 'vue-router';
import { getCharacter, previewCharacterVoice } from '@/api/characters';
import { characterInitial, genderText } from '@/utils/display';

const route = useRoute();
const loading = ref(true);
const previewing = ref(false);
const previewAudioRef = ref();
const character = ref({});

async function load() {
  loading.value = true;
  try {
    const res = await getCharacter(route.params.id);
    character.value = res.data || {};
  } finally {
    loading.value = false;
  }
}

async function previewVoice() {
  if (!character.value?.id || previewing.value) return;

  previewing.value = true;
  try {
    const res = await previewCharacterVoice(character.value.id);
    const audioUrl = res.data?.audioUrl;
    if (!audioUrl) {
      ElMessage.warning('暂时没有生成试听音频');
      return;
    }
    previewAudioRef.value.src = audioUrl;
    await previewAudioRef.value.play();
  } catch {
  } finally {
    previewing.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.detail-page {
  display: grid;
  gap: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
}

.portrait {
  min-height: 480px;
  display: grid;
  place-items: center;
  position: relative;
  background:
    radial-gradient(circle at 50% 34%, rgba(255, 255, 255, 0.9), transparent 32%),
    linear-gradient(135deg, rgba(115, 87, 232, 0.18), rgba(255, 255, 255, 0.9));
}

.online {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 6px 12px;
  border-radius: 999px;
  color: var(--success);
  background: rgba(54, 179, 126, 0.12);
  font-weight: 800;
}

.detail-main {
  display: grid;
  gap: 24px;
  padding: 28px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.detail-header h1,
.detail-header p,
.detail-main section p,
.voice-panel p {
  margin: 0;
}

.detail-header h1 {
  margin-bottom: 8px;
  font-size: 34px;
}

.detail-header p,
.detail-main section p,
.voice-panel p {
  color: var(--text-secondary);
  line-height: 1.8;
}

.detail-actions {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-main h3 {
  margin: 0 0 10px;
}

.voice-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--primary-soft);
}

@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .portrait {
    min-height: 260px;
  }

  .detail-header {
    flex-direction: column;
  }
}
</style>
