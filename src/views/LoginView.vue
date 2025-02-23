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
          @keyup.enter="handleLogin"
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
        </n-form>
        <n-button 
          class="login-button" 
          @click="handleLogin" 
          :loading="loading"
          size="large"
          block
        >
          登录
        </n-button>
      </n-card>
      <div class="login-footer">
        <p>Copyright © 2024 Northwest University. All Rights Reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { NCard, NForm, NFormItem, NInput, NButton, NIcon } from 'naive-ui'
import { UserOutlined, LockOutlined } from '@vicons/antd'
import axios from 'axios'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const formRef = ref(null)

const formValue = reactive({
  username: '',
  password: ''
})

const rules = {
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

const handleLogin = async () => {
  // 先进行表单验证
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true // 开始加载
      console.log(formValue.username,formValue.password)
      try {
        // 调用后端登录接口
        const response = await fetch('/api/user/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: formValue.username,
            password: formValue.password,
          }),
        })

        // 检查 HTTP 响应状态
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        console.log(response.json())
        console.log(response.status)

        // 根据后端返回的结果进行处理
        if (response.status === 200) {
          message.success('登录成功')
          localStorage.setItem('isLoggedIn', 'true');
          router.push('/analysis') // 跳转到分析页面
        } else {
          message.error(response.json().msg)
        }
      } catch (error) {
        // 捕获网络或接口异常
        console.error('登录请求失败:', error)
        message.error('登录失败，请稍后重试')
      } finally {
        loading.value = false // 请求完成，结束加载
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