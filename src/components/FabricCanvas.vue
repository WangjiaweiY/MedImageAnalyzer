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
  }
});

const emit = defineEmits(['update:annotation-data', 'annotation-changed']);

const canvasRef = ref(null);
let canvas = null;
let isDrawing = false;
let currentObject = null;
let drawingStartPoint = { x: 0, y: 0 };

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
  
  const json = canvas.toJSON();
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
      canvas.freeDrawingBrush.width = 2;
    } else {
      canvas.isDrawingMode = false;
    }
  });
  
  watch(() => props.color, (newColor) => {
    if (props.tool === 'draw') {
      canvas.freeDrawingBrush.color = newColor;
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