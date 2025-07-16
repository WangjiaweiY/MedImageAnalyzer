<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-header">
        <div class="logo-container">
          <img src="/imgs/logo.png" alt="迪英加科技" class="logo-image" />
        </div>
        <h2>武汉协和医院病理阅片系统</h2>
      </div>
      <n-card class="login-card">
        <n-form
          ref="formRef"
          :model="formValue"
          :rules="rules"
          @keyup.enter="handleSubmit"
        >
          <n-form-item path="username">
            <n-input
              v-model:value="formValue.username"
              placeholder="请输入用户名"
              size="large"
            >
              <template #prefix>
                <n-icon><UserOutlined /></n-icon>
              </template>
            </n-input>
          </n-form-item>
          <n-form-item path="password">
            <n-input
              v-model:value="formValue.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password-on="click"
            >
              <template #prefix>
                <n-icon><LockOutlined /></n-icon>
              </template>
            </n-input>
          </n-form-item>
          <!-- 注册模式下额外显示确认密码 -->
          <template v-if="mode === 'register'">
            <n-form-item path="confirmPassword">
              <n-input
                v-model:value="formValue.confirmPassword"
                type="password"
                placeholder="请确认密码"
                size="large"
                show-password-on="click"
              >
                <template #prefix>
                  <n-icon><LockOutlined /></n-icon>
                </template>
              </n-input>
            </n-form-item>
          </template>
        </n-form>
        <n-button 
          class="login-button" 
          @click="handleSubmit" 
          :loading="loading"
          size="large"
          block
        >
          {{ mode === 'login' ? '登录' : '注册' }}
        </n-button>
      </n-card>
      <!-- 模式切换链接 -->
      <div class="login-extra">
        <template v-if="mode === 'login'">
          <span>没有账号？</span>
          <n-button text @click="toggleMode">注册</n-button>
        </template>
        <template v-else>
          <span>已有账号？</span>
          <n-button text @click="toggleMode">登录</n-button>
        </template>
      </div>
      <div class="login-footer">
        <p>Copyright © 2025 DiPath. All Rights Reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { NCard, NForm, NFormItem, NInput, NButton, NIcon } from 'naive-ui'
import { UserOutlined, LockOutlined } from '@vicons/antd'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/services/api'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const formRef = ref(null)
// mode 用于标记当前处于登录还是注册状态
const mode = ref('login')
const userStore = useUserStore()


const formValue = reactive({
  username: '',
  password: '',
  confirmPassword: '' // 注册模式下使用
})

// 根据不同模式定义表单校验规则
const rules = computed(() => {
  const commonRules = {
    username: {
      required: true,
      message: '请输入用户名',
      trigger: 'blur'
    },
    password: {
      required: true,
      message: '请输入密码',
      trigger: 'blur'
    }
  }
  if (mode.value === 'register') {
    return {
      ...commonRules,
      confirmPassword: {
        required: true,
        message: '请确认密码',
        trigger: 'blur',
        validator: (rule, value) => {
          if (value !== formValue.password) {
            return new Error('两次输入的密码不一致')
          }
          return true
        }
      }
    }
  }
  return commonRules
})

// 切换登录和注册模式，并重置表单数据
const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  formValue.username = ''
  formValue.password = ''
  formValue.confirmPassword = ''
  formRef.value?.clearValidate()
}

const handleSubmit = async () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true
      try {
        if (mode.value === 'login') {
          // 使用API服务登录
          const result = await authApi.login(formValue.username, formValue.password);
          
          if (result.token) {
            // 登录成功，保存用户信息和token
            userStore.setUserData({
              username: formValue.username,
              token: result.token
            });
            
            router.push('/analysis');
          } else {
            message.error(result.message || '登录失败');
          }
        } else {
          // 使用API服务注册
          const result = await authApi.register(formValue.username, formValue.password);
          
          if (result.success) {
            message.success('注册成功');
            // 注册成功后自动切换到登录模式
            mode.value = 'login';
            formValue.username = '';
            formValue.password = '';
            formValue.confirmPassword = '';
          } else {
            message.error(result.message || '注册失败');
          }
        }
      } catch (error) {
        console.error(`${mode.value === 'login' ? '登录' : '注册'}请求失败:`, error);
        message.error(error.message || `${mode.value === 'login' ? '登录' : '注册'}失败，请稍后重试`);
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(120deg, #1890ff 0%, #096dd9 50%, #003a8c 100%);
  overflow: hidden;
  position: relative;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: url('/imgs/shidizai.jpg') center/cover no-repeat;
  opacity: 0.05;
  z-index: 0;
}

.login-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 20px;
  animation: fadeIn 0.8s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-container {
  margin-bottom: 12px;
  width: 220px;
  height: auto;
  display: flex;
  justify-content: center;
  animation: pulseGlow 2s infinite alternate;
}

@keyframes pulseGlow {
  from { filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.3)); }
  to { filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.7)); }
}

.logo-image {
  max-width: 100%;
  height: auto;
}

.login-header h2 {
  font-size: 22px;
  font-weight: 500;
  margin: 12px 0 0;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  letter-spacing: 1px;
}

.login-card {
  width: 420px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 0 20px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.login-card:hover {
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2), 0 0 25px rgba(255, 255, 255, 0.15);
  transform: translateY(-5px);
}

:deep(.n-card-header) {
  text-align: center;
  font-size: 20px;
  font-weight: 500;
}

:deep(.n-input) {
  height: 44px;
}

:deep(.n-button) {
  height: 44px;
  font-size: 16px;
}

.login-button {
  margin-top: 20px;
  border-radius: 6px;
  font-weight: 500;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  height: 46px;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(9, 109, 217, 0.3);
}

.login-extra {
  margin-top: 16px;
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.login-extra :deep(.n-button) {
  color: #fff;
  padding: 0 4px;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.login-extra :deep(.n-button:hover) {
  color: #e6f7ff;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
}

.login-footer {
  margin-top: 40px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .login-card {
    width: 90%;
    max-width: 360px;
  }
  
  .logo-container {
    width: 180px;
  }
  
  .login-header h2 {
    font-size: 18px;
  }
}
</style>
