<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">AiChat</h2>
      <p class="auth-subtitle">创建你的账号</p>
      <el-form :model="form" :rules="rules" ref="formRef" label-width="0">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" :prefix-icon="UserIcon" />
        </el-form-item>
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="邮箱" size="large" :prefix-icon="MessageIcon" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" size="large" :prefix-icon="LockIcon" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="submit">
            注册
          </el-button>
        </el-form-item>
      </el-form>
      <div class="auth-footer">
        已有账号？<router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User as UserIcon, Message as MessageIcon, Lock as LockIcon } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const formRef = ref();
const loading = ref(false);
const form = ref({ username: '', email: '', password: '' });

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 2, max: 20, message: '用户名 2-20 字符', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少 6 位', trigger: 'blur' }],
};

async function submit() {
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    await userStore.register(form.value.username, form.value.email, form.value.password);
    ElMessage.success('注册成功');
    router.push('/home');
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
