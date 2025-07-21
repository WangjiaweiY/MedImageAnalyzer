<template>
  <n-layout-content class="content">
    <!-- 标准布局 -->
    <div v-if="!isSpecialLayout" class="viewer-container" :class="getLayoutClass" ref="viewerContainerRef">
      <div 
        v-for="(v, index) in getViewerCount" 
        :key="index"
        class="viewer-wrapper"
        :class="[getViewerClass(index), { 'selected-viewer': selectedViewerIndex === index }]"
        @click="selectViewer(index)"
      >
        <!-- 添加图像标题栏 -->
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[index] || '未加载图像' }}</span>
        </div>
        
        <!-- 关闭按钮 - 移至右上角，增加大小和可点击区域 -->
        <div v-if="hasDzi(index)" class="close-image-wrapper" @click.stop="closeImage(index)">
          <n-button 
            class="close-image-btn" 
            circle 
            quaternary 
            type="error" 
            size="small"
          >
            <template #icon>
              <n-icon><close-outlined /></n-icon>
            </template>
          </n-button>
        </div>
        
        <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
        <div v-if="!hasDzi(index)" class="placeholder">
          <div class="empty-state-content">
            <n-icon size="48" class="empty-icon"><file-image-outlined /></n-icon>
            <p class="empty-title">请选择图像文件</p>
            <p class="empty-description">从左侧文件列表中选择要查看的图像</p>
          </div>
        </div>
        
        <!-- 使用新的FabricOverlayCanvas组件 -->
        <fabric-overlay-canvas
          v-if="hasDzi(index) && viewers[index]"
          :ref="el => annotationCanvasRefs[index] = el"
          :viewer="viewers[index]"
          :tool="currentTool"
          :color="currentColor"
          :line-width="currentLineWidth"
          :annotation-enabled="annotationMode && selectedViewerIndex === index"
          :is-sync-annotation="isSyncAnnotation"
          v-model:annotation-data="annotationData[index]"
          @annotation-changed="handleAnnotationChanged(index)"
        />
        
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
    
    <!-- 左大右小布局 -->
    <div v-else-if="layoutType === 101" class="viewer-container layout-left-big-right-small" ref="viewerContainerRef">
      <!-- 左侧大图 -->
      <div 
        class="viewer-wrapper big-viewer"
        :class="{ 'selected-viewer': selectedViewerIndex === 0 }"
        @click="selectViewer(0)"
      >
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[0] || '未加载图像' }}</span>
        </div>
        
        <div v-if="hasDzi(0)" class="close-image-wrapper" @click.stop="closeImage(0)">
          <n-button class="close-image-btn" circle quaternary type="error" size="small">
            <template #icon><n-icon><close-outlined /></n-icon></template>
          </n-button>
        </div>
        
        <div id="osdViewer-0" class="osd-viewer"></div>
        <div v-if="!hasDzi(0)" class="placeholder">
          <div class="empty-state-content">
            <n-icon size="60" class="empty-icon"><file-image-outlined /></n-icon>
            <p class="empty-title">请选择主图像</p>
            <p class="empty-description">从左侧文件列表中选择要作为主图像查看的文件</p>
          </div>
        </div>
        
        <!-- 其他组件保持不变 -->
      </div>
      
      <!-- 右侧小图容器 -->
      <div class="right-small-container">
        <div 
          v-for="index in 4" 
          :key="index"
          class="viewer-wrapper small-viewer"
          :class="{ 'selected-viewer': selectedViewerIndex === index }"
          @click="selectViewer(index)"
        >
          <div class="image-title-bar">
            <span class="image-title">{{ viewerFileNames[index] || '未加载图像' }}</span>
          </div>
          
          <div v-if="hasDzi(index)" class="close-image-wrapper" @click.stop="closeImage(index)">
            <n-button class="close-image-btn" circle quaternary type="error" size="small">
              <template #icon><n-icon><close-outlined /></n-icon></template>
            </n-button>
          </div>
          
          <div :id="`osdViewer-${index}`" class="osd-viewer"></div>
          <div v-if="!hasDzi(index)" class="placeholder">
            <div class="empty-state-content small">
              <n-icon size="32" class="empty-icon"><file-image-outlined /></n-icon>
              <p class="empty-title">请选择图像</p>
            </div>
          </div>
          
          <!-- 其他组件保持不变 -->
        </div>
      </div>
    </div>
    
    <!-- 右大左小布局 -->
    <div v-else-if="layoutType === 102" class="viewer-container layout-right-big-left-small" ref="viewerContainerRef">
      <!-- 左侧小图容器 -->
      <div class="left-small-container">
        <div 
          v-for="index in 4" 
          :key="index - 1"
          class="viewer-wrapper small-viewer"
          :class="{ 'selected-viewer': selectedViewerIndex === index - 1 }"
          @click="selectViewer(index - 1)"
        >
          <div class="image-title-bar">
            <span class="image-title">{{ viewerFileNames[index - 1] || '未加载图像' }}</span>
          </div>
          
          <div v-if="hasDzi(index - 1)" class="close-image-wrapper" @click.stop="closeImage(index - 1)">
            <n-button class="close-image-btn" circle quaternary type="error" size="small">
              <template #icon><n-icon><close-outlined /></n-icon></template>
            </n-button>
          </div>
          
          <div :id="`osdViewer-${index - 1}`" class="osd-viewer"></div>
          <div v-if="!hasDzi(index - 1)" class="placeholder">
            <div class="empty-state-content small">
              <n-icon size="32" class="empty-icon"><file-image-outlined /></n-icon>
              <p class="empty-title">请选择图像</p>
            </div>
          </div>
          
          <!-- 其他组件保持不变 -->
        </div>
      </div>
      
      <!-- 右侧大图 -->
      <div 
        class="viewer-wrapper big-viewer"
        :class="{ 'selected-viewer': selectedViewerIndex === 4 }"
        @click="selectViewer(4)"
      >
        <div class="image-title-bar">
          <span class="image-title">{{ viewerFileNames[4] || '未加载图像' }}</span>
        </div>
        
        <div v-if="hasDzi(4)" class="close-image-wrapper" @click.stop="closeImage(4)">
          <n-button class="close-image-btn" circle quaternary type="error" size="small">
            <template #icon><n-icon><close-outlined /></n-icon></template>
          </n-button>
        </div>
        
        <div id="osdViewer-4" class="osd-viewer"></div>
        <div v-if="!hasDzi(4)" class="placeholder">
          <div class="empty-state-content">
            <n-icon size="60" class="empty-icon"><file-image-outlined /></n-icon>
            <p class="empty-title">请选择主图像</p>
            <p class="empty-description">从左侧文件列表中选择要作为主图像查看的文件</p>
          </div>
        </div>
        
        <!-- 其他组件保持不变 -->
      </div>
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
import { EditOutlined, CameraOutlined, CloseOutlined, FileImageOutlined } from '@vicons/antd'
import OpenSeadragon from 'openseadragon'
import { throttle } from '../utils/throttle'
import FabricOverlayCanvas from './FabricOverlayCanvas.vue'
import ImageToolbox from './ImageToolbox.vue'

const message = useMessage()
const viewerContainerRef = ref(null)
// 注: 标注同步开关状态通过props传入

const props = defineProps({
  layoutType: {
    type: Number,
    required: true
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
  },
  isSyncAnnotation: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:selectedViewerIndex',
  'update:viewers',
  'initViewers',
  'updateViewerDziUrl',
  'setupSync',
  'closeImage',
  'update:isSyncAnnotation'
])

// 标注相关状态
const annotationMode = ref(false);
const currentTool = ref('select');
const currentColor = ref('red');
const currentLineWidth = ref(0.5);
const annotationCanvasRefs = ref([]);
const annotationData = ref([]);

// 关闭图像
const closeImage = (index) => {
  emit('closeImage', index);
}

// 获取布局类名
const getLayoutClass = computed(() => {
  if (props.layoutType === 101) {
    return 'layout-left-big-right-small';
  } else if (props.layoutType === 102) {
    return 'layout-right-big-left-small';
  } else {
    return `layout-${props.layoutType}`;
  }
});

// 检查是否使用特殊布局
const isSpecialLayout = computed(() => {
  return props.layoutType === 101 || props.layoutType === 102;
});

// 获取查看器数量
const getViewerCount = computed(() => {
  if (props.layoutType === 101 || props.layoutType === 102) {
    return 5; // 这两种布局都有5个查看器
  } else {
    return props.layoutType;
  }
});

// 获取查看器类名
const getViewerClass = (index) => {
  if (props.layoutType === 101) {
    return index === 0 ? 'big-viewer' : 'small-viewer';
  } else if (props.layoutType === 102) {
    return index === 4 ? 'big-viewer' : 'small-viewer';
  }
  return '';
};

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
  
  // 标注模式状态由FabricOverlayCanvas组件自动处理
};

// 处理工具切换
const handleToolChanged = (toolInfo) => {
  currentTool.value = toolInfo.tool;
  currentColor.value = toolInfo.color;
  
  // 处理线宽参数
  if (toolInfo.lineWidth !== undefined) {
    currentLineWidth.value = toolInfo.lineWidth;
  }
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
  
  // 只有在使用自由绘制工具时才同步标注到其他查看器
  if (props.isSyncAnnotation && currentTool.value === 'draw') {
    syncAnnotationToOtherViewers(index);
  }
};

// 同步标注到其他查看器
const syncAnnotationToOtherViewers = (sourceIndex) => {
  if (!annotationData.value[sourceIndex]) return;
  
  // 将标注数据同步到其他已加载图像的查看器
  props.viewers.forEach((viewer, targetIndex) => {
    if (targetIndex !== sourceIndex && viewer !== null) {
      annotationData.value[targetIndex] = annotationData.value[sourceIndex];
    }
  });
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
  background: linear-gradient(135deg, #f7f9fc 0%, #edf1f7 100%);
  padding: 20px;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.viewer-container {
  display: grid;
  gap: 16px;
  height: 100%;
  overflow: hidden;
}

/* 修复展示框的样式问题 */
.viewer-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.03);
  min-height: 200px; /* 确保最小高度 */
}

.viewer-wrapper:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
}

.selected-viewer {
  box-shadow: 0 0 0 2px #1890ff, 0 6px 20px rgba(24, 144, 255, 0.25) !important;
  z-index: 5; /* 确保选中的视图在上层 */
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white; /* 统一背景色 */
  position: absolute;
  top: 32px; /* 标题栏高度 */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.osd-viewer {
  width: 100%;
  flex: 1;
  position: relative;
  z-index: 1;
}

.image-title-bar {
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.9) 0%, rgba(9, 109, 217, 0.9) 100%);
  color: white;
  padding: 8px 15px;
  font-size: 13px;
  text-align: left;
  width: 100%;
  height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(5px);
}

.image-title {
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  letter-spacing: 0.3px;
}

.close-image-btn {
  height: 28px;
  width: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-image-wrapper {
  position: absolute;
  top: 40px;
  right: 15px;
  z-index: 100;
  cursor: pointer;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  padding: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  opacity: 0.85;
}

.close-image-wrapper:hover {
  background-color: #ffffff;
  transform: scale(1.15) translateY(-2px);
  opacity: 1;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}

/* 标准布局样式 */
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

/* 进一步改进多图模式和空状态 */
.layout-9 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  max-height: 100%; /* 确保不会溢出父容器 */
}

.layout-16 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  max-height: 100%; /* 确保不会溢出父容器 */
}

/* 确保多图模式下每个查看器都有合适的最小高度 */
.layout-9 .viewer-wrapper,
.layout-16 .viewer-wrapper {
  min-height: 140px;
}

/* 在多图模式下简化空状态显示 */
.layout-9 .empty-description,
.layout-16 .empty-description {
  display: none; /* 隐藏描述文本，节省空间 */
}

.layout-9 .empty-icon,
.layout-16 .empty-icon {
  margin-bottom: 8px; /* 减少图标下方间距 */
  font-size: 24px;
}

.layout-9 .empty-title,
.layout-16 .empty-title {
  font-size: 13px;
  margin-bottom: 0;
}

/* 强化选中效果 */
.viewer-wrapper.selected-viewer {
  z-index: 10 !important; /* 确保在最上层 */
  transform: translateY(-2px); /* 轻微上浮效果 */
  box-shadow: 0 0 0 2px #1890ff, 0 8px 24px rgba(24, 144, 255, 0.35) !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.viewer-wrapper.selected-viewer::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 12px;
  box-shadow: inset 0 0 0 2px #1890ff;
  pointer-events: none;
  z-index: 100;
}

/* 增强小查看器的空状态显示 */
.small .empty-state-content {
  padding: 10px;
}

.small .empty-icon {
  margin-bottom: 8px;
  font-size: 20px;
}

/* 确保标题栏在所有模式下的一致性 */
.image-title-bar {
  background: linear-gradient(90deg, rgba(24, 144, 255, 0.9) 0%, rgba(9, 109, 217, 0.9) 100%);
  box-sizing: border-box;
}

/* 添加上传提示图标 */
.empty-state-content::after {
  content: '';
  position: absolute;
  bottom: 15px;
  right: 15px;
  width: 24px;
  height: 24px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%231890ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 4v12"/></svg>') no-repeat center center;
  opacity: 0.5;
  transition: all 0.3s ease;
  pointer-events: none;
}

.empty-state-content:hover::after {
  opacity: 0.8;
  transform: translateY(-2px);
}

/* 移除多余样式 */
.layout-9 .empty-state-content::after,
.layout-16 .empty-state-content::after,
.small .empty-state-content::after {
  display: none; /* 在空间有限的情况下不显示额外图标 */
}

.small-viewer {
  min-height: 120px;
}

.small-viewer .image-title-bar {
  font-size: 11px;
  height: 26px;
  padding: 3px 10px;
}

.small-viewer .close-image-wrapper {
  top: 35px;
  right: 8px;
}

.small-viewer .close-image-btn {
  height: 24px;
  width: 24px;
}

.big-viewer {
  height: 100%;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.big-viewer .image-title-bar {
  height: 36px;
  font-size: 14px;
  padding: 8px 16px;
}

.right-small-container, .left-small-container {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
}

.right-small-container::-webkit-scrollbar, 
.left-small-container::-webkit-scrollbar {
  width: 4px;
}

.right-small-container::-webkit-scrollbar-thumb, 
.left-small-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.right-small-container::-webkit-scrollbar-thumb:hover, 
.left-small-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

.layout-left-big-right-small, .layout-right-big-left-small {
  height: 100%;
}

:deep(.n-empty) {
  font-size: 14px;
  color: #8c9bab;
}

:deep(.n-empty .n-empty__description) {
  font-size: 13px;
  color: #8c9bab;
}

/* 优化空白状态样式 */
.empty-state-content {
  text-align: center;
  padding: 20px;
  color: #8c9bab;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: white; /* 统一背景色 */
  border-radius: 0;
  transition: all 0.3s ease;
}

.empty-state-content:hover {
  background: #f9fafc; /* 减轻色差 */
  box-shadow: none; /* 移除内阴影 */
}

.empty-icon {
  color: #1890ff;
  opacity: 0.6;
  margin-bottom: 16px;
  filter: drop-shadow(0 3px 8px rgba(24, 144, 255, 0.25));
  transition: all 0.3s ease;
}

.empty-state-content:hover .empty-icon {
  transform: scale(1.05);
  opacity: 0.8;
}

.empty-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1a2b4b;
}

.empty-description {
  font-size: 14px;
  line-height: 1.5;
  max-width: 200px;
  color: #5e6c84;
  margin: 0 auto; /* 居中 */
}

/* 小型查看器的空状态样式 */
.small .empty-state-content {
  padding: 15px;
}

.small .empty-icon {
  margin-bottom: 10px;
  font-size: 24px;
}

.small .empty-title {
  font-size: 14px;
  margin-bottom: 4px;
}

.small .empty-description {
  font-size: 12px;
  max-width: 150px;
}

/* 确保大查看器和小查看器的标题栏高度正确 */
.small-viewer .placeholder {
  top: 26px; /* 小型查看器的标题栏高度 */
}

.big-viewer .placeholder {
  top: 36px; /* 大型查看器的标题栏高度 */
}

/* 恢复特殊布局样式 */
/* 左大右小布局 */
.layout-left-big-right-small {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr;
  gap: 20px;
  height: 100%;
}

.layout-left-big-right-small .big-viewer {
  grid-column: 1;
  grid-row: 1;
  min-height: 100%;
}

.layout-left-big-right-small .small-viewer {
  height: auto;
}

/* 右侧小图区域容器 */
.layout-left-big-right-small .right-small-container {
  grid-column: 2;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
  padding-right: 5px;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* 右大左小布局 */
.layout-right-big-left-small {
  display: grid;
  grid-template-columns: 1fr 2fr;
  grid-template-rows: 1fr;
  gap: 20px;
  height: 100%;
}

.layout-right-big-left-small .big-viewer {
  grid-column: 2;
  grid-row: 1;
  min-height: 100%;
}

.layout-right-big-left-small .small-viewer {
  height: auto;
}

/* 左侧小图区域容器 */
.layout-right-big-left-small .left-small-container {
  grid-column: 1;
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(4, 1fr);
  gap: 16px;
  height: 100%;
  padding-right: 5px;
  overflow-y: auto;
  scrollbar-width: thin;
}

/* 恢复标注切换按钮样式 */
.annotation-toggle {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 101;
}

:deep(.annotation-toggle .n-button) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  border: none;
}

:deep(.annotation-toggle .n-button:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
}

:deep(.annotation-toggle .n-button[type="primary"]) {
  background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
}

/* 进一步优化特殊布局的空状态显示 */
.layout-left-big-right-small .big-viewer .empty-state-content,
.layout-right-big-left-small .big-viewer .empty-state-content {
  padding: 30px;
}

.layout-left-big-right-small .big-viewer .empty-icon,
.layout-right-big-left-small .big-viewer .empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

/* 修复小视图容器滚动 */
.right-small-container, .left-small-container {
  -webkit-overflow-scrolling: touch; /* 添加iOS滚动惯性 */
}

/* 修复多图模式下图像容器溢出问题 */
.viewer-container {
  max-height: 100%;
  overflow-y: hidden;
}
</style> 