<template>
  <n-layout-content class="content">
    <div class="viewer-container" :class="`layout-${layoutType}`" ref="viewerContainerRef">
      <div 
        v-for="(v, index) in layoutType" 
        :key="index"
        class="viewer-wrapper"
        @click="selectViewer(index)"
        :class="{ 'selected-viewer': selectedViewerIndex === index }"
      >
        <!-- 添加图像标题栏 -->
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[index] || '未加载图像' }}</span>
        </div>
        
        <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
        <div v-if="!hasDzi(index)" class="placeholder">
          <n-empty size="large" description="请选择图像文件"></n-empty>
        </div>
        
        <!-- 添加标注画布组件 -->
        <div v-if="hasDzi(index)" :class="{ 'annotation-enabled': annotationMode && selectedViewerIndex === index }">
          <fabric-canvas
            :ref="el => annotationCanvasRefs[index] = el"
            :tool="currentTool"
            :color="currentColor"
            :annotation-enabled="annotationMode && selectedViewerIndex === index"
            v-model:annotation-data="annotationData[index]"
            @annotation-changed="handleAnnotationChanged(index)"
          />
        </div>
        
        <!-- 添加工具箱，只在该查看器被选中且标注模式开启时显示 -->
        <image-toolbox
          v-if="hasDzi(index) && selectedViewerIndex === index && annotationMode"
          @tool-changed="handleToolChanged"
          @clear-annotations="clearAnnotations(index)"
        />
        
        <!-- 添加标注模式切换按钮 -->
        <div v-if="hasDzi(index) && selectedViewerIndex === index" class="annotation-toggle">
          <n-tooltip placement="left">
            <template #trigger>
              <n-button 
                circle 
                :type="annotationMode ? 'primary' : 'default'" 
                @click="toggleAnnotationMode"
              >
                <template #icon>
                  <n-icon><edit-outlined /></n-icon>
                </template>
              </n-button>
            </template>
            <span>{{ annotationMode ? '退出标注模式' : '进入标注模式' }}</span>
          </n-tooltip>
        </div>
      </div>
    </div>
    
    <!-- 保存视图按钮 -->
    <div class="save-view-button" v-if="hasLoadedImages">
      <n-tooltip placement="left">
        <template #trigger>
          <n-button 
            circle 
            type="success" 
            @click="saveMultiView"
          >
            <template #icon>
              <n-icon><camera-outlined /></n-icon>
            </template>
          </n-button>
        </template>
        <span>保存当前视图</span>
      </n-tooltip>
    </div>
  </n-layout-content>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { 
  NLayoutContent, 
  NEmpty,
  NButton,
  NTooltip,
  NIcon,
  useMessage
} from 'naive-ui'
import { EditOutlined, CameraOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { throttle } from '../utils/throttle'
import FabricCanvas from './FabricCanvas.vue'
import ImageToolbox from './ImageToolbox.vue'

const message = useMessage()
const viewerContainerRef = ref(null)

const props = defineProps({
  layoutType: {
    type: Number,
    required: true
  },
  syncEnabled: {
    type: Boolean,
    default: true
  },
  selectedViewerIndex: {
    type: Number,
    default: null
  },
  viewers: {
    type: Array,
    required: true
  },
  viewerFileNames: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'update:selectedViewerIndex',
  'update:viewers',
  'initViewers',
  'updateViewerDziUrl',
  'setupSync'
])

// 标注相关状态
const annotationMode = ref(false);
const currentTool = ref('select');
const currentColor = ref('red');
const annotationCanvasRefs = ref([]);
const annotationData = ref([]);

// 计算属性：检查是否有已加载的图像
const hasLoadedImages = computed(() => {
  return props.viewers.some(viewer => viewer !== null);
});

// 保存多视图为高清图片
const saveMultiView = async () => {
  if (!viewerContainerRef.value) return;
  
  // 显示加载中提示
  message.loading('正在加载html2canvas并生成高清图片，请稍候...', { duration: 0 });
  
  try {
    // 确保html2canvas已加载
    const html2canvasModule = await import('html2canvas');
    const html2canvas = html2canvasModule.default;
    
    // 给浏览器一些时间来更新UI
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 使用html2canvas捕获当前视图
    const canvas = await html2canvas(viewerContainerRef.value, {
      scale: 2, // 提高分辨率，生成更高清的图片
      useCORS: true, // 允许跨域图片
      allowTaint: true, // 允许加载跨域图片
      backgroundColor: '#f5f7f9', // 与背景颜色一致
      logging: false // 关闭日志
    });
    
    // 创建下载链接
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    const fileName = `多视图快照_${dateStr}_${timeStr}.png`;
    
    // 将canvas转换为Blob对象
    canvas.toBlob((blob) => {
      // 关闭加载提示
      message.destroyAll();
      
      if (!blob) {
        message.error('图像生成失败，请重试');
        return;
      }
      
      // 创建下载链接并模拟点击
      const link = document.createElement('a');
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      
      // 释放URL对象
      URL.revokeObjectURL(link.href);
      
      message.success('多视图图片已保存');
    }, 'image/png', 1.0);
  } catch (error) {
    console.error('保存多视图出错:', error);
    message.error('保存失败，请重试');
  } finally {
    message.destroyAll();
  }
};

// 切换标注模式
const toggleAnnotationMode = () => {
  annotationMode.value = !annotationMode.value;
  
  // 处理所有查看器的交互状态
  if (annotationMode.value) {
    // 开启标注模式：禁用所有查看器的交互
    props.viewers.forEach((viewer, index) => {
      if (viewer) {
        viewer.setMouseNavEnabled(false);
        viewer.gestureSettingsMouse.clickToZoom = false;
      }
    });
  } else {
    // 关闭标注模式：启用所有查看器的交互
    props.viewers.forEach((viewer, index) => {
      if (viewer) {
        viewer.setMouseNavEnabled(true);
        viewer.gestureSettingsMouse.clickToZoom = true;
      }
    });
  }
};

// 处理工具切换
const handleToolChanged = (toolInfo) => {
  currentTool.value = toolInfo.tool;
  currentColor.value = toolInfo.color;
};

// 清除标注
const clearAnnotations = (index) => {
  const canvas = annotationCanvasRefs.value[index];
  if (canvas) {
    canvas.clearCanvas();
  }
};

// 处理标注变化
const handleAnnotationChanged = (index) => {
  // 可以在这里添加保存标注数据的逻辑
  console.log(`标注已更改: 查看器 ${index}`);
};

// 检查某个索引的查看器是否有加载的图像
const hasDzi = (index) => {
  return props.viewers[index] !== null
}

// 选择查看器
const selectViewer = (index) => {
  emit('update:selectedViewerIndex', index)
}

// 监听布局变化，当布局改变时重新初始化查看器
watch(() => props.layoutType, () => {
  emit('initViewers')
  annotationData.value = new Array(props.layoutType).fill('');
})

// 监听所选查看器变化
watch(() => props.selectedViewerIndex, (newIndex, oldIndex) => {
  // 如果启用了标注模式，根据所选查看器更新OSD的交互状态
  if (annotationMode.value) {
    if (oldIndex !== null && props.viewers[oldIndex]) {
      props.viewers[oldIndex].setMouseNavEnabled(true);
      props.viewers[oldIndex].gestureSettingsMouse.clickToZoom = true;
    }
    
    if (newIndex !== null && props.viewers[newIndex]) {
      props.viewers[newIndex].setMouseNavEnabled(false);
      props.viewers[newIndex].gestureSettingsMouse.clickToZoom = false;
    }
  }
})

// 初始化
onMounted(() => {
  nextTick(() => {
    emit('initViewers')
    annotationData.value = new Array(props.layoutType).fill('');
  })
})
</script>

<style scoped>
.content {
  flex: 1;
  padding: 20px;
  background: #f5f7f9;
  position: relative;
}

.viewer-container {
  height: 100%;
  display: grid;
  gap: 20px;
}

.viewer-wrapper {
  position: relative;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.selected-viewer {
  border: 3px solid #1890ff;
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245,247,249,0.5);
}

.osd-viewer {
  width: 100%;
  flex: 1;
}

.image-title-bar {
  background: #1890ff;
  color: white;
  padding: 4px 10px;
  font-size: 12px;
  text-align: left;
  width: 100%;
  height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 50;
  display: flex;
  align-items: center;
}

.image-title {
  font-weight: bold;
}

.layout-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

.layout-2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 1fr;
}

.layout-4 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}

.layout-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
}

.annotation-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 101;
}

.annotation-enabled {
  pointer-events: auto;
}

.save-view-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}
</style> 