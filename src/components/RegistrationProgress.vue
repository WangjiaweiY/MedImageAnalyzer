<template>
  <div class="registration-progress">
    <n-card :bordered="false" size="small" class="progress-card">
      <template #header>
        <div class="progress-header">
          <div class="title">
            <n-icon size="20" color="#1890ff">
              <sync-outlined v-if="isProcessing" class="spinning" />
              <check-circle-outlined v-else-if="isCompleted" />
              <exclamation-circle-outlined v-else-if="isFailed" />
              <clock-circle-outlined v-else />
            </n-icon>
            <span>配准进度</span>
          </div>
          <!-- 移动关闭按钮插槽到状态标签上方 -->
          <div class="header-right">
            <slot name="close-button"></slot>
            <n-tag :type="statusTagType" size="small">{{ statusText }}</n-tag>
          </div>
        </div>
        <!-- 删除这里的关闭按钮插槽 -->
      </template>
      
      <div class="progress-container">
        <!-- 进度条 -->
        <n-progress
          type="line"
          :percentage="progress"
          :processing="isProcessing"
          :indicator-placement="'inside'"
          :status="progressStatus"
        >
          <span class="progress-text">{{ progress }}%</span>
        </n-progress>
        
        <!-- 当前进度信息 -->
        <div class="progress-message">
          {{ task?.message || '等待开始配准...' }}
        </div>
      </div>
      
      <!-- 任务详情 -->
      <div class="task-details" v-if="task">
        <div class="detail-item">
          <span class="label">文件夹:</span>
          <span class="value">{{ task.folder }}</span>
        </div>
        <div class="detail-item">
          <span class="label">开始时间:</span>
          <span class="value">{{ formatTime(task.startTime) }}</span>
        </div>
        <div class="detail-item">
          <span class="label">最后更新:</span>
          <span class="value">{{ formatTime(task.lastUpdated) }}</span>
        </div>
        <div class="detail-item" v-if="task.completionTime">
          <span class="label">完成时间:</span>
          <span class="value">{{ formatTime(task.completionTime) }}</span>
        </div>
        <div class="detail-item error-message" v-if="task.error">
          <span class="label">错误信息:</span>
          <span class="value">{{ task.error }}</span>
        </div>
      </div>
      
      <template #action>
        <n-space justify="end">
          <n-button 
            v-if="!isCompleted && !isFailed && task"
            size="small" 
            @click="refreshProgress"
          >
            刷新状态
          </n-button>
          <n-button 
            v-if="isCompleted" 
            size="small" 
            type="primary"
            @click="$emit('view-result', task)"
          >
            查看结果
          </n-button>
        </n-space>
      </template>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { 
  NCard, 
  NProgress, 
  NSpace, 
  NButton, 
  NIcon, 
  NTag 
} from 'naive-ui';
import { 
  SyncOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@vicons/antd';

const props = defineProps({
  task: {
    type: Object,
    default: null
  },
  pollingEnabled: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['refresh', 'view-result']);

// 计算属性
const progress = computed(() => props.task ? props.task.progress : 0);
const isProcessing = computed(() => props.task && props.task.status === 'processing');
const isCompleted = computed(() => props.task && props.task.status === 'completed');
const isFailed = computed(() => props.task && props.task.status === 'failed');
const isPending = computed(() => props.task && props.task.status === 'pending');

const statusText = computed(() => {
  if (!props.task) return '未开始';
  switch(props.task.status) {
    case 'pending': return '等待中';
    case 'processing': return '处理中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return '未知状态';
  }
});

const statusTagType = computed(() => {
  if (!props.task) return 'default';
  switch(props.task.status) {
    case 'pending': return 'default';
    case 'processing': return 'info';
    case 'completed': return 'success';
    case 'failed': return 'error';
    default: return 'default';
  }
});

const progressStatus = computed(() => {
  if (!props.task) return 'default';
  if (props.task.status === 'completed') return 'success';
  if (props.task.status === 'failed') return 'error';
  // 正在处理中的任务也使用success状态，这样进度条会随着进度增加而变绿
  return 'success';
});

// 格式化日期时间
const formatTime = (timeString) => {
  if (!timeString) return '无';
  try {
    const date = new Date(timeString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  } catch (err) {
    return timeString;
  }
};

// 轮询进度更新
let pollingInterval = null;

const startPolling = () => {
  if (!props.pollingEnabled) return;
  
  stopPolling(); // 先清除之前的轮询
  
  // 只对处理中或等待中的任务进行轮询
  if (props.task && (isPending.value || isProcessing.value)) {
    pollingInterval = setInterval(() => {
      refreshProgress();
    }, 30000); // 30秒更新一次
  }
};

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

const refreshProgress = () => {
  emit('refresh');
};

// 生命周期钩子
onMounted(() => {
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>

<style scoped>
.registration-progress {
  margin-bottom: 16px;
}

.progress-card {
  border-radius: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spinning {
  animation: spin 1.5s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.progress-container {
  margin: 16px 0;
}

.progress-message {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.progress-text {
  font-weight: bold;
  font-size: 12px;
}

.task-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #eee;
}

.detail-item {
  margin-bottom: 8px;
  font-size: 13px;
  display: flex;
}

.label {
  width: 80px;
  color: #666;
}

.value {
  flex: 1;
  color: #333;
}

.error-message .value {
  color: #ff4d4f;
}
</style> 