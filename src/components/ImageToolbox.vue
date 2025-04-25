<template>
  <div class="image-toolbox">
    <n-button-group vertical>
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button :type="currentTool === 'select' ? 'primary' : 'default'" @click="selectTool('select')">
            <template #icon>
              <n-icon><cursor-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>选择模式</span>
      </n-tooltip>
      
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button :type="currentTool === 'rect' ? 'primary' : 'default'" @click="selectTool('rect')">
            <template #icon>
              <n-icon><border-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>矩形工具</span>
      </n-tooltip>
      
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button :type="currentTool === 'circle' ? 'primary' : 'default'" @click="selectTool('circle')">
            <template #icon>
              <n-icon><highlight-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>圆形工具</span>
      </n-tooltip>
      
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button :type="currentTool === 'text' ? 'primary' : 'default'" @click="selectTool('text')">
            <template #icon>
              <n-icon><edit-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>文字工具</span>
      </n-tooltip>
      
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button :type="currentTool === 'draw' ? 'primary' : 'default'" @click="selectTool('draw')">
            <template #icon>
              <n-icon><highlight-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>自由绘制</span>
      </n-tooltip>
      
      <n-divider />
      
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button @click="clearAnnotations">
            <template #icon>
              <n-icon><delete-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>清除所有标注</span>
      </n-tooltip>
    </n-button-group>
    
    <n-modal
      v-model:show="colorPickerVisible"
      preset="card"
      title="选择颜色"
      :style="{ width: '300px' }"
    >
      <n-color-picker v-model:value="currentColor" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { 
  NButtonGroup, 
  NButton, 
  NTooltip, 
  NIcon, 
  NDivider,
  NColorPicker,
  NModal
} from 'naive-ui';

// 正确导入图标组件
import { 
  AimOutlined as CursorOutlined, 
  BorderOutlined, 
  HighlightOutlined,
  EditOutlined,
  DeleteOutlined
} from '@vicons/antd';

const emit = defineEmits(['tool-changed', 'clear-annotations']);

const currentTool = ref('select'); // 默认选择工具
const colorPickerVisible = ref(false);
const currentColor = ref('#1890ff'); // 默认蓝色

const selectTool = (tool) => {
  currentTool.value = tool;
  emit('tool-changed', {
    tool,
    color: currentColor.value
  });
};

const clearAnnotations = () => {
  if (confirm('确定要清除所有标注吗？')) {
    emit('clear-annotations');
  }
};
</script>

<style scoped>
.image-toolbox {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 8px;
}
</style> 