<template>
  <div class="login-container">
    <div class="login-content">
      <div class="login-header">
        <h1>西北大学智能信息处理实验室</h1>
        <h2>医学影像病理分析系统</h2>
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
        <p>Copyright © 2024 Northwest University. All Rights Reserved.</p>
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

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const formRef = ref(null)
// mode 用于标记当前处于登录还是注册状态
const mode = ref('login')

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
          // 登录接口请求
          const response = await fetch('/api/user/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: formValue.username,
              password: formValue.password
            })
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          if (response.status === 200) {
            message.success('登录成功')
            localStorage.setItem('isLoggedIn', 'true')
            router.push('/analysis')
          } else {
            const data = await response.json()
            message.error(data.msg || '登录失败')
          }
        } else {
          // 注册接口请求
          const response = await fetch('/api/user/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: formValue.username,
              password: formValue.password
            })
          })
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          if (response.status === 200) {
            message.success('注册成功')
            // 注册成功后可自动切换到登录模式
            mode.value = 'login'
            formValue.username = ''
            formValue.password = ''
            formValue.confirmPassword = ''
          } else {
            const data = await response.json()
            message.error(data.msg || '注册失败')
          }
        }
      } catch (error) {
        console.error(`${mode.value === 'login' ? '登录' : '注册'}请求失败:`, error)
        message.error(`${mode.value === 'login' ? '登录' : '注册'}失败，请稍后重试`)
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  overflow: hidden;
  position: relative;
}

.login-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 20px;
}

.login-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.login-header h2 {
  font-size: 20px;
  font-weight: 400;
  margin: 8px 0 0;
  opacity: 0.9;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.login-card {
  width: 500px;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
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
  background-color: #096dd9 !important;  
  border-color: #096dd9 !important;     
  color: white !important;              
  margin-top: 24px;
}

.login-extra {
  margin-top: 16px;
  color: #fff;
  font-size: 14px;
}

.login-extra n-button {
  margin-left: 8px;
}

.login-footer {
  margin-top: 100px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .login-card {
    width: 90%;
    max-width: 400px;
  }

  .login-header h1 {
    font-size: 24px;
  }

  .login-header h2 {
    font-size: 18px;
  }
}
</style>
