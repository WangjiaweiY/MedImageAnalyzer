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
      
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button :type="currentTool === 'eraser' ? 'primary' : 'default'" @click="selectTool('eraser')">
            <template #icon>
              <n-icon><clear-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>橡皮擦</span>
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
          <n-button @click="showLineWidthPicker" :disabled="currentTool === 'eraser'">
            <template #icon>
              <n-icon><line-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>调整线宽: {{ lineWidth }}px</span>
      </n-tooltip>
      
      <!-- 橡皮擦大小调节按钮 -->
      <n-tooltip trigger="hover" placement="right">
        <template #trigger>
          <n-button @click="showEraserSizePicker" :disabled="currentTool !== 'eraser'">
            <template #icon>
              <n-icon><border-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>调整橡皮擦大小: {{ eraserSize }}px</span>
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
      :style="{ width: '340px' }"
    >
      <n-color-picker v-model:value="currentColor" @confirm="updateToolSettings" />
      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <n-button type="primary" @click="confirmColorSelection">确定</n-button>
      </div>
    </n-modal>
    
    <!-- 线宽调节弹窗 -->
    <n-modal
      v-model:show="lineWidthPickerVisible"
      preset="card"
      title="调整线宽"
      :style="{ width: '340px' }"
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
      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <n-button type="primary" @click="confirmLineWidth">确定</n-button>
      </div>
    </n-modal>
    
    <!-- 橡皮擦大小调节弹窗 -->
    <n-modal
      v-model:show="eraserSizePickerVisible"
      preset="card"
      title="调整橡皮擦大小"
      :style="{ width: '340px' }"
    >
      <div class="eraser-size-preview">
        <div class="eraser-circle" :style="{width: eraserSize + 'px', height: eraserSize + 'px'}"></div>
      </div>
      <n-slider 
        v-model:value="eraserSize" 
        :min="1" 
        :max="50" 
        :step="1"
        @update:value="updateEraserSize" 
      />
      <div class="slider-labels">
        <span>小</span>
        <span>大</span>
      </div>
      <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
        <n-button type="primary" @click="confirmEraserSize">确定</n-button>
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
  LineOutlined,
  ClearOutlined
} from '@vicons/antd';

const emit = defineEmits(['tool-changed', 'clear-annotations']);

const currentTool = ref('select'); // 默认选择工具
const colorPickerVisible = ref(false);
const lineWidthPickerVisible = ref(false);
const eraserSizePickerVisible = ref(false);
const currentColor = ref('red'); // 默认红色
const lineWidth = ref(0.5); // 默认线宽为0.5px
const eraserSize = ref(10); // 默认橡皮擦大小为10px

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

const showEraserSizePicker = () => {
  eraserSizePickerVisible.value = true;
};

const confirmColorSelection = () => {
  colorPickerVisible.value = false;
  updateToolSettings();
};

const confirmLineWidth = () => {
  lineWidthPickerVisible.value = false;
  updateToolSettings();
};

const confirmEraserSize = () => {
  eraserSizePickerVisible.value = false;
  updateToolSettings();
};

const updateEraserSize = () => {
  updateToolSettings();
};

const updateToolSettings = () => {
  emit('tool-changed', {
    tool: currentTool.value,
    color: currentColor.value,
    lineWidth: lineWidth.value,
    eraserSize: eraserSize.value
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
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 12px 8px;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
}

.image-toolbox:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2), 0 3px 10px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

:deep(.n-button-group .n-button) {
  margin: 3px 0;
  border-radius: 8px;
  transition: all 0.2s ease;
  height: 38px;
  width: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.n-button-group .n-button:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.n-button-group .n-button[type="primary"]) {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.25);
  border: none;
}

:deep(.n-button-group .n-button[type="primary"]:hover) {
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%);
  box-shadow: 0 4px 10px rgba(24, 144, 255, 0.35);
}

:deep(.n-divider) {
  margin: 8px 0;
}

.color-preview {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #fff;
  margin: 0 auto;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

:deep(.n-button:hover) .color-preview {
  transform: scale(1.1);
}

.line-width-preview {
  width: 100%;
  background-color: currentColor;
  margin: 16px 0;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 13px;
  color: #8c9bab;
  font-weight: 500;
}

:deep(.n-slider .n-slider-rail) {
  height: 6px;
  border-radius: 3px;
}

:deep(.n-slider .n-slider-handle) {
  height: 16px;
  width: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

:deep(.n-slider .n-slider-handle:hover),
:deep(.n-slider .n-slider-handle:active) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

:deep(.n-modal.n-card) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 5px 10px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

:deep(.n-card-header) {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:deep(.n-card-header__main) {
  font-size: 16px;
  font-weight: 500;
  color: #1a2b4b;
}

:deep(.n-card__content) {
  padding: 20px;
}

.eraser-size-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  margin: 16px 0;
  background-color: #f5f5f5;
  border-radius: 8px;
  position: relative;
}

.eraser-circle {
  background-color: rgba(255, 0, 0, 0.3);
  border: 2px dashed #ff4d4f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
}

.eraser-circle::before {
  content: '✕';
  color: #ff4d4f;
  font-size: 14px;
  font-weight: bold;
}
</style> 