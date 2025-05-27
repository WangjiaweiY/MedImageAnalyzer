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
      
      <!-- 颜色选择按钮 -->
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button @click="showColorPicker">
            <div class="color-preview" :style="{backgroundColor: currentColor}"></div>
          </n-button>
        </template>
        <span>选择颜色</span>
      </n-tooltip>
      
      <!-- 线宽调节按钮 -->
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button @click="showLineWidthPicker">
            <template #icon>
              <n-icon><line-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>调整线宽: {{ lineWidth }}px</span>
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
    
    <!-- 颜色选择弹窗 -->
    <n-modal
      v-model:show="colorPickerVisible"
      preset="card"
      title="选择颜色"
      :style="{ width: '300px' }"
    >
      <n-color-picker v-model:value="currentColor" @confirm="updateToolSettings" />
    </n-modal>
    
    <!-- 线宽调节弹窗 -->
    <n-modal
      v-model:show="lineWidthPickerVisible"
      preset="card"
      title="调整线宽"
      :style="{ width: '300px' }"
    >
      <div class="line-width-preview" :style="{height: lineWidth + 'px', backgroundColor: currentColor}"></div>
      <n-slider 
        v-model:value="lineWidth" 
        :min="0.1" 
        :max="20" 
        :step="0.1"
        @update:value="updateToolSettings" 
      />
      <div class="slider-labels">
        <span>细</span>
        <span>粗</span>
      </div>
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
  NModal,
  NSlider
} from 'naive-ui';

// 导入图标组件
import { 
  AimOutlined as CursorOutlined, 
  BorderOutlined, 
  HighlightOutlined,
  EditOutlined,
  DeleteOutlined,
  LineOutlined
} from '@vicons/antd';

const emit = defineEmits(['tool-changed', 'clear-annotations']);

const currentTool = ref('select'); // 默认选择工具
const colorPickerVisible = ref(false);
const lineWidthPickerVisible = ref(false);
const currentColor = ref('red'); // 默认红色
const lineWidth = ref(0.5); // 默认线宽为0.5px

const selectTool = (tool) => {
  currentTool.value = tool;
  updateToolSettings();
};

const showColorPicker = () => {
  colorPickerVisible.value = true;
};

const showLineWidthPicker = () => {
  lineWidthPickerVisible.value = true;
};

const updateToolSettings = () => {
  emit('tool-changed', {
    tool: currentTool.value,
    color: currentColor.value,
    lineWidth: lineWidth.value
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

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin: 0 auto;
}

.line-width-preview {
  width: 100%;
  background-color: currentColor;
  margin: 10px 0;
  border-radius: 2px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}
</style> 