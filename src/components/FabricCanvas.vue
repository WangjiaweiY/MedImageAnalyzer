<template>
  <div class="fabric-canvas-container">
    <canvas ref="canvasRef" class="fabric-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { fabric } from 'fabric';


const props = defineProps({
  // 当前选择的工具
  tool: {
    type: String,
    default: 'select'
  },
  // 绘图颜色
  color: {
    type: String,
    default: 'red'
  },
  // 线宽
  lineWidth: {
    type: Number,
    default: 2
  },
  // 图像URL，如果有
  imageUrl: {
    type: String,
    default: ''
  },
  // 是否启用标注功能
  annotationEnabled: {
    type: Boolean,
    default: false
  },
  // 编辑数据，用于恢复已有标注
  annotationData: {
    type: String,
    default: ''
  },
  // 是否启用标注同步
  isSyncAnnotation: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:annotation-data', 'annotation-changed']);

const canvasRef = ref(null);
let canvas = null;
let isDrawing = false;
let currentObject = null;
let drawingStartPoint = { x: 0, y: 0 };
// 新增标识属性，用于记录是否是在同步状态下创建的标注
const SYNC_ATTRIBUTE = 'createdWithSyncEnabled';
// 防止递归调用的标志
let isProcessingSync = false;

// 创建Fabric Canvas实例
const initCanvas = () => {
  if (!canvasRef.value) return;
  
  // 创建Fabric Canvas，使用全局对象window.fabric
  canvas = new window.fabric.Canvas(canvasRef.value, {
    isDrawingMode: false,
    selection: true,
    width: canvasRef.value.parentElement.clientWidth,
    height: canvasRef.value.parentElement.clientHeight
  });
  
  // 设置背景颜色
  canvas.setBackgroundColor('rgba(0,0,0,0)', canvas.renderAll.bind(canvas));
  
  // 如果有已保存的标注数据，恢复它
  if (props.annotationData) {
    try {
      canvas.loadFromJSON(props.annotationData, () => {
        canvas.renderAll();
      });
    } catch (error) {
      console.error('Error loading annotation data:', error);
    }
  }
  
  // 绑定事件
  setupEventListeners();
  
  // 观察工具变化
  watchToolChanges();
};

// 设置事件监听器
const setupEventListeners = () => {
  canvas.on('mouse:down', onMouseDown);
  canvas.on('mouse:move', onMouseMove);
  canvas.on('mouse:up', onMouseUp);
  canvas.on('object:added', () => saveAnnotationData());
  canvas.on('object:modified', () => saveAnnotationData());
  canvas.on('object:removed', () => saveAnnotationData());
};

// 鼠标按下事件处理
const onMouseDown = (options) => {
  if (!props.annotationEnabled) return;
  
  const pointer = canvas.getPointer(options.e);
  drawingStartPoint = { x: pointer.x, y: pointer.y };
  
  if (props.tool === 'select') {
    canvas.isDrawingMode = false;
    return;
  }
  
  // 橡皮擦模式处理
  if (props.tool === 'eraser') {
    // 获取点击位置的对象
    const target = canvas.findTarget(options.e, false);
    if (target && (target.type === 'path' || target.type === 'text' || target.type === 'rect' || target.type === 'circle')) {
      // 删除被点击的标注对象
      canvas.remove(target);
      saveAnnotationData();
    }
    return;
  }
  
  isDrawing = true;
  
  switch (props.tool) {
    case 'rect':
      currentObject = new window.fabric.Rect({
        left: pointer.x,
        top: pointer.y,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: props.color,
        strokeWidth: 2,
        selectable: true
      });
      canvas.add(currentObject);
      break;
      
    case 'circle':
      currentObject = new window.fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 0,
        fill: 'transparent',
        stroke: props.color,
        strokeWidth: 2,
        selectable: true
      });
      canvas.add(currentObject);
      break;
      
    case 'text':
      const text = prompt('请输入文字：', '文字标注');
      if (text) {
        const textObject = new window.fabric.Text(text, {
          left: pointer.x,
          top: pointer.y,
          fill: props.color,
          fontFamily: 'Arial',
          fontSize: 20,
          selectable: true
        });
        canvas.add(textObject);
        saveAnnotationData();
      }
      break;
      
    case 'draw':
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = props.color;
      canvas.freeDrawingBrush.width = 2;
      break;
      
    case 'eraser':
      // 橡皮擦模式 - 禁用绘图模式，改为点击删除模式
      canvas.isDrawingMode = false;
      canvas.selection = false;
      
      // 设置鼠标样式为橡皮擦
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      break;
  }
};

// 鼠标移动事件处理
const onMouseMove = (options) => {
  if (!isDrawing || !currentObject) return;
  
  const pointer = canvas.getPointer(options.e);
  
  if (props.tool === 'rect') {
    const width = Math.abs(pointer.x - drawingStartPoint.x);
    const height = Math.abs(pointer.y - drawingStartPoint.y);
    
    // 更新对象位置和尺寸
    currentObject.set({
      left: Math.min(pointer.x, drawingStartPoint.x),
      top: Math.min(pointer.y, drawingStartPoint.y),
      width: width,
      height: height
    });
    
    currentObject.setCoords();
    canvas.renderAll();
  } else if (props.tool === 'circle') {
    const radius = Math.sqrt(
      Math.pow(pointer.x - drawingStartPoint.x, 2) + 
      Math.pow(pointer.y - drawingStartPoint.y, 2)
    ) / 2;
    
    const centerX = (pointer.x + drawingStartPoint.x) / 2;
    const centerY = (pointer.y + drawingStartPoint.y) / 2;
    
    currentObject.set({
      left: centerX - radius,
      top: centerY - radius,
      radius: radius
    });
    
    currentObject.setCoords();
    canvas.renderAll();
  }
};

// 鼠标释放事件处理
const onMouseUp = () => {
  isDrawing = false;
  currentObject = null;
  canvas.isDrawingMode = false;
  
  // 保存标注数据
  saveAnnotationData();
};

// 保存标注数据
const saveAnnotationData = () => {
  if (!canvas) return;
  
  // 将同步属性一并保存到JSON中
  const json = canvas.toJSON(['selectable', 'hasControls', SYNC_ATTRIBUTE]);
  const jsonString = JSON.stringify(json);
  
  emit('update:annotation-data', jsonString);
  emit('annotation-changed');
};

// 清除所有标注
const clearCanvas = () => {
  if (!canvas) return;
  
  canvas.clear();
  canvas.setBackgroundColor('rgba(0,0,0,0)', canvas.renderAll.bind(canvas));
  
  saveAnnotationData();
};

// 监听工具变化
const watchToolChanges = () => {
  watch(() => props.tool, (newTool) => {
    if (newTool === 'draw') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.color = props.color;
      canvas.freeDrawingBrush.width = props.lineWidth || 2;
      
      // 移除旧的路径创建监听器，避免重复
      canvas.off('path:created');
      
      // 添加事件监听，记录绘制的路径是否是在同步状态下创建的
      canvas.on('path:created', function(e) {
        // 将当前的同步状态记录在绘制对象上
        e.path.set(SYNC_ATTRIBUTE, props.isSyncAnnotation);
      });
    } else if (newTool === 'eraser') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
    }
  });
  
  watch(() => props.color, (newColor) => {
    if (props.tool === 'draw') {
      canvas.freeDrawingBrush.color = newColor;
    }
  });
  
  watch(() => props.lineWidth, (newLineWidth) => {
    if (props.tool === 'draw' && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.width = newLineWidth;
    }
  });
  
  watch(() => props.annotationEnabled, (enabled) => {
    canvas.selection = enabled;
    canvas.forEachObject(obj => {
      obj.selectable = enabled;
      obj.evented = enabled;
    });
    
    if (!enabled) {
      canvas.isDrawingMode = false;
    }
  });
};

// 调整Canvas大小
const resizeCanvas = () => {
  if (!canvas || !canvasRef.value) return;
  
  canvas.setWidth(canvasRef.value.parentElement.clientWidth);
  canvas.setHeight(canvasRef.value.parentElement.clientHeight);
  canvas.renderAll();
};

// 添加背景图像
const addBackgroundImage = (url) => {
  if (!canvas) return;
  
  window.fabric.Image.fromURL(url, (img) => {
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    
    // 调整图像大小以适应画布
    img.scaleToWidth(canvasWidth);
    
    // 如果缩放后高度超出，则按高度缩放
    if (img.getScaledHeight() > canvasHeight) {
      img.scaleToHeight(canvasHeight);
    }
    
    // 居中显示图像
    canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
      originX: 'center',
      originY: 'center',
      left: canvasWidth / 2,
      top: canvasHeight / 2
    });
  });
};

// 暴露方法给父组件
defineExpose({
  clearCanvas,
  resizeCanvas,
  addBackgroundImage
});

// 监听标注数据变化
watch(() => props.annotationData, (newData, oldData) => {
  if (!canvas || !newData || isProcessingSync) return;
  
  try {
    const parsedData = JSON.parse(newData);
    const oldParsedData = oldData ? JSON.parse(oldData) : null;
    
    // 如果是从其他查看器同步来的数据，且确实是同步操作触发的变化
    const isFromSync = oldParsedData && parsedData.objects && oldParsedData.objects && 
        parsedData.objects.length !== oldParsedData.objects.length &&
        // 确保新数据中只包含同步标注（避免本地添加非同步对象时触发）
        parsedData.objects.every(obj => obj.type !== 'path' || obj[SYNC_ATTRIBUTE] === true);
    
    if (isFromSync) {
      // 设置同步处理标志，防止递归调用
      isProcessingSync = true;
      
      // 保存当前画布上的非同步对象（包括文本和非同步状态下创建的路径）
      const nonSyncObjects = [];
      canvas.getObjects().forEach(obj => {
        // 保留所有不是同步标注的对象
        if (obj.type === 'text' || obj.type === 'rect' || obj.type === 'circle' || 
            (obj.type === 'path' && obj[SYNC_ATTRIBUTE] !== true)) {
          nonSyncObjects.push(obj.toObject(['selectable', 'hasControls', SYNC_ATTRIBUTE]));
        }
      });
      
      // 清空画布并加载新的同步数据
      canvas.clear();
      
      // 加载同步数据（只包含同步状态下创建的路径）
      canvas.loadFromJSON(newData, () => {
        // 重新添加非同步对象
        if (nonSyncObjects.length > 0) {
          fabric.util.enlivenObjects(nonSyncObjects, (objects) => {
            objects.forEach(obj => {
              canvas.add(obj);
            });
            canvas.renderAll();
            // 清除同步处理标志
            isProcessingSync = false;
          });
        } else {
          canvas.renderAll();
          // 清除同步处理标志
          isProcessingSync = false;
        }
      });
    } else {
      // 正常加载数据（通常是本地操作或初始化）
      canvas.loadFromJSON(newData, () => {
        canvas.renderAll();
      });
    }
  } catch (error) {
    console.error('Error loading annotation data:', error);
    // 出错时也要清标志，避免卡死
    isProcessingSync = false;
  }
});

// 生命周期钩子
onMounted(() => {
  initCanvas();
  
  window.addEventListener('resize', resizeCanvas);
  
  // 如果提供了图像URL，添加背景图像
  if (props.imageUrl) {
    addBackgroundImage(props.imageUrl);
  }
});

onUnmounted(() => {
  if (canvas) {
    canvas.dispose();
  }
  
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style scoped>
.fabric-canvas-container {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 50;
  pointer-events: none;
}

/* 当启用标注时，允许画布接收事件 */
.fabric-canvas-container {
  pointer-events: v-bind('props.annotationEnabled ? "auto" : "none"');
}

.fabric-canvas {
  width: 100%;
  height: 100%;
}
</style> 