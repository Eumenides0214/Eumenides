<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">AiChat</h2>
      <p class="auth-subtitle">登录你的账号</p>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="0">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" size="large" :prefix-icon="MessageIcon" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" :prefix-icon="LockIcon" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="submit">
            登录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="auth-footer">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Message as MessageIcon, Lock as LockIcon } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref();
const loading = ref(false);
const form = ref({ email: '', password: '' });

const rules = {
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function submit() {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    await userStore.login(form.value.email, form.value.password);
    ElMessage.success('登录成功');
    router.push(route.query.redirect || '/home');
  } catch {} finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.auth-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(circle at 18% 18%, rgba(54, 179, 126, 0.12), transparent 28%),
    radial-gradient(circle at 82% 20%, rgba(115, 87, 232, 0.18), transparent 30%),
    var(--page-bg);
}
.auth-card {
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-hover);
  backdrop-filter: blur(16px);
}
.auth-title {
  text-align: center;
  font-size: 28px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--primary), #9b8cff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.auth-subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 30px;
}
.auth-footer {
  text-align: center;
  color: var(--text-secondary);
}
.auth-footer a {
  color: var(--primary);
  text-decoration: none;
}
</style>
