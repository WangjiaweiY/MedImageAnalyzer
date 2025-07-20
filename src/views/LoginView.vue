<template>
  <div class="login-container">
    <!-- 装饰元素 -->
    <div class="decoration-circle circle-1"></div>
    <div class="decoration-circle circle-2"></div>
    <div class="decoration-line line-1"></div>
    <div class="decoration-line line-2"></div>
    
    <div class="login-content">
      <div class="login-header">
        <div class="logo-container">
          <img src="/imgs/logo.png" alt="迪英加科技" class="logo-image" />
        </div>
        <h2>武汉协和医院病理阅片系统</h2>
        <div class="header-line"></div>
      </div>
      <n-card class="login-card" :class="{'focused': isFormFocused}">
        <div class="card-title">{{ mode === 'login' ? '登录' : '注册' }}</div>
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
              class="custom-input"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
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
              class="custom-input"
              @focus="handleInputFocus"
              @blur="handleInputBlur"
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
                class="custom-input"
                @focus="handleInputFocus"
                @blur="handleInputBlur"
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
          type="primary"
        >
          <span class="button-text">{{ mode === 'login' ? '登录' : '注册' }}</span>
        </n-button>
      </n-card>
      <!-- 模式切换链接 -->
      <div class="login-extra">
        <template v-if="mode === 'login'">
          <span>没有账号？</span>
          <n-button text @click="toggleMode" class="toggle-mode-btn">注册</n-button>
        </template>
        <template v-else>
          <span>已有账号？</span>
          <n-button text @click="toggleMode" class="toggle-mode-btn">登录</n-button>
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
const isFormFocused = ref(false)


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

const handleInputFocus = () => {
  isFormFocused.value = true
}

const handleInputBlur = () => {
  // 检查所有输入框是否都没有焦点
  if (!document.activeElement || 
     (!document.activeElement.classList.contains('n-input') && 
      !document.activeElement.closest('.n-input'))) {
    isFormFocused.value = false
  }
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
  background: linear-gradient(135deg, #0a4d8c 0%, #1890ff 100%);
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
  opacity: 0.08;
  z-index: 0;
}

/* 添加简约几何背景元素 */
.login-container::after {
  content: '';
  position: absolute;
  top: -10%;
  right: -10%;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
  z-index: 0;
}

.login-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  padding: 20px;
  animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-30px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-header {
  text-align: center;
  color: #fff;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-container {
  margin-bottom: 16px;
  width: 180px;
  height: auto;
  display: flex;
  justify-content: center;
  animation: subtle-float 6s ease-in-out infinite;
}

@keyframes subtle-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulseGlow {
  from { filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4)); }
  to { filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.8)); }
}

.logo-image {
  max-width: 100%;
  height: auto;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
}

.login-header h2 {
  font-size: 24px;
  font-weight: 500;
  margin: 8px 0 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  letter-spacing: 1.5px;
}

.header-line {
  width: 60px;
  height: 3px;
  background: rgba(255, 255, 255, 0.8);
  margin: 15px auto 0;
  border-radius: 2px;
}

/* 装饰性背景元素 - 更多变化 */
.decoration-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
  z-index: 0;
  backdrop-filter: blur(8px);
  background-clip: padding-box;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.2) 100%);
  top: 15%;
  left: 10%;
  animation: float 15s infinite alternate ease-in-out;
}

.circle-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.15) 100%);
  bottom: 10%;
  right: 5%;
  animation: float 12s infinite alternate-reverse ease-in-out;
}

.decoration-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.1);
  z-index: 0;
}

.line-1 {
  width: 150px;
  height: 3px;
  top: 30%;
  right: 15%;
  transform: rotate(-30deg);
  animation: pulse 8s infinite alternate;
}

.line-2 {
  width: 100px;
  height: 2px;
  bottom: 25%;
  left: 20%;
  transform: rotate(45deg);
  animation: pulse 10s infinite alternate-reverse;
}

@keyframes float {
  0% { transform: translateY(0) rotate(0); }
  100% { transform: translateY(-20px) rotate(5deg); }
}

@keyframes pulse {
  0% { opacity: 0.05; }
  100% { opacity: 0.2; }
}

.card-title {
  text-align: center;
  font-size: 22px;
  color: #0a4d8c;
  margin-bottom: 24px;
  font-weight: 500;
  letter-spacing: 1px;
  position: relative;
}

.login-card {
  width: 380px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px); /* 兼容Safari */
  background: rgba(255, 255, 255, 0.75); /* 降低不透明度以显示毛玻璃效果 */
  background: linear-gradient(
    135deg, 
    rgba(255, 255, 255, 0.85) 0%, 
    rgba(255, 255, 255, 0.75) 100%
  ); /* 渐变背景增加质感 */
  border-radius: 16px;
  box-shadow: 
    0 15px 35px rgba(0, 0, 0, 0.15),
    0 0 25px rgba(255, 255, 255, 0.1),
    0 5px 15px rgba(9, 109, 217, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.6); /* 内阴影增加质感 */
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.215, 0.61, 0.355, 1);
  border: 1px solid rgba(255, 255, 255, 0.5); /* 更明显的边框 */
  padding: 20px 15px;
  transform: translateY(0);
  opacity: 1;
  position: relative;
  z-index: 2;
  animation: cardEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cardEnter {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.login-card:hover {
  transform: translateY(-5px);
  box-shadow: 
    0 20px 45px rgba(0, 0, 0, 0.2), 
    0 0 30px rgba(255, 255, 255, 0.2),
    0 8px 20px rgba(9, 109, 217, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.65);
}

.login-card:after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2));
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box, 
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.login-card.focused {
  box-shadow: 
    0 20px 45px rgba(0, 0, 0, 0.25), 
    0 0 30px rgba(24, 144, 255, 0.3),
    0 8px 20px rgba(9, 109, 217, 0.2);
}

.button-text {
  position: relative;
  display: inline-block;
  transition: all 0.3s ease;
  color: #ffffff; /* 确保按钮文字为白色 */
}

.login-button:hover .button-text {
  transform: scale(1.05);
  letter-spacing: 3px;
}

:deep(.n-card-header) {
  text-align: center;
  font-size: 20px;
  font-weight: 500;
}

:deep(.n-input) {
  height: 48px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.n-input:focus-within) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(24, 144, 255, 0.1);
}

:deep(.n-input-wrapper) {
  padding-left: 15px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.9);
}

:deep(.n-input__prefix) {
  margin-right: 10px;
  color: #1890ff;
}

:deep(.n-button) {
  height: 48px;
  font-size: 16px;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

/* 登录按钮样式修改 */
.login-button {
  margin-top: 25px;
  border-radius: 8px;
  font-weight: 500;
  letter-spacing: 2px;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  height: 48px;
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  border: none;
  box-shadow: 
    0 5px 15px rgba(9, 109, 217, 0.2),
    inset 0 1px 1px rgba(255, 255, 255, 0.3); /* 内阴影增加质感 */
  color: #ffffff; /* 确保按钮文字为白色 */
  position: relative;
  overflow: hidden;
}

.login-button:before {
  content: "";
  position: absolute;
  top: 0;
  left: -50%;
  width: 150%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.1) 50%,
    rgba(255,255,255,0) 100%
  );
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.login-button:hover:before {
  transform: translateX(100%);
}

.login-button:hover {
  transform: translateY(-3px);
  box-shadow: 
    0 8px 20px rgba(9, 109, 217, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.4);
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
}

.login-button:active {
  transform: translateY(1px);
}

.login-extra {
  margin-top: 18px;
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
  text-underline-offset: 3px;
  transition: all 0.3s ease;
}

.login-extra :deep(.n-button:hover) {
  color: #e6f7ff;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.7);
  text-decoration-thickness: 2px;
}

.login-footer {
  margin-top: 40px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  text-align: center;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  letter-spacing: 0.5px;
}

.custom-input:hover :deep(.n-input__border) {
  border-color: rgba(24, 144, 255, 0.5);
}

.toggle-mode-btn {
  position: relative;
}

.toggle-mode-btn::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 1px;
  background-color: #fff;
  transform: scaleX(0);
  transition: transform 0.3s ease;
  transform-origin: center;
}

.toggle-mode-btn:hover::after {
  transform: scaleX(1);
}

:deep(.n-form-item-feedback-wrapper) {
  min-height: 22px;
}

:deep(.n-form-item) {
  margin-bottom: 20px;
}

:deep(.n-form-item-feedback) {
  color: #ff4d4f;
  font-size: 12px;
}

/* 改进自定义输入框样式 */
.custom-input {
  position: relative;
  overflow: visible;
}

:deep(.n-input-wrapper):before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 0 0 0px rgba(24, 144, 255, 0.2);
  transition: all 0.3s ease;
  z-index: -1;
}

:deep(.n-input:focus-within .n-input-wrapper):before {
  box-shadow: 0 0 0 4px rgba(24, 144, 255, 0.2);
}

:deep(.n-button:after) {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  background: rgba(255, 255, 255, 0.5);
  opacity: 0;
  border-radius: 100%;
  transform: scale(1, 1) translate(-50%);
  transform-origin: 50% 50%;
}

:deep(.n-button:focus:not(:active)::after) {
  animation: ripple 1s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0, 0);
    opacity: 0.5;
  }
  20% {
    transform: scale(25, 25);
    opacity: 0.3;
  }
  100% {
    opacity: 0;
    transform: scale(40, 40);
  }
}

/* 响应式设计 */
@media (max-width: 600px) {
  .login-card {
    width: 92%;
    max-width: 360px;
  }
  
  .logo-container {
    width: 160px;
  }
  
  .login-header h2 {
    font-size: 20px;
  }
}
</style>

