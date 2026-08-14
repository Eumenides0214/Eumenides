<template>
  <div class="page-shell placeholder-page">
    <div class="soft-card empty-panel">
      <el-icon><Star /></el-icon>
      <h2>收藏角色</h2>
      <p>这里预留收藏角色能力。后续可以把常聊或喜欢的角色固定在这里。</p>
      <el-button type="primary" @click="$router.push('/characters')">浏览我的角色</el-button>
    </div>
  </div>
</template>

<script setup>
import { Star } from '@element-plus/icons-vue';
</script>

<style scoped>
.placeholder-page {
  min-height: calc(100vh - 64px);
  display: grid;
  place-items: center;
}

.empty-panel {
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  text-align: center;
}

.empty-panel .el-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--primary);
  background: var(--primary-light);
  font-size: 24px;
}

.empty-panel h2 {
  margin: 0;
}

.empty-panel p {
  margin: 0 0 8px;
  color: var(--text-secondary);
}
</style>
