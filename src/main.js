import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// 导入OpenSeaDragon和Fabric.js
import OpenSeadragon from 'openseadragon'
import { fabric } from 'fabric'

// 确保OpenSeaDragon.Viewer.prototype上有fabricjsOverlay方法
if (window.OpenSeadragon && !OpenSeadragon.Viewer.prototype.fabricjsOverlay) {
  console.log('手动初始化OpenSeaDragon FabricJS Overlay扩展');
  
  // 定义fabricjsOverlay方法
  OpenSeadragon.Viewer.prototype.fabricjsOverlay = function(options) {
    // 创建Overlay对象的函数
    const createOverlay = (viewer, staticCanvas) => {
      const self = {};
      self._viewer = viewer;
      self._containerWidth = 0;
      self._containerHeight = 0;
      
      // 创建canvas容器
      self._canvasdiv = document.createElement('div');
      self._canvasdiv.style.position = 'absolute';
      self._canvasdiv.style.left = "0px";
      self._canvasdiv.style.top = "0px";
      self._canvasdiv.style.width = '100%';
      self._canvasdiv.style.height = '100%';
      viewer.canvas.appendChild(self._canvasdiv);
      
      // 创建canvas元素
      self._canvas = document.createElement('canvas');
      self._canvas.setAttribute('id', 'osd-overlaycanvas');
      self._canvasdiv.appendChild(self._canvas);
      
      // 创建fabric.Canvas实例
      self._fabricCanvas = staticCanvas 
        ? new fabric.StaticCanvas(self._canvas)
        : new fabric.Canvas(self._canvas);
      
      // 禁用fabric selection
      self._fabricCanvas.selection = false;
      
      // 防止OSD处理fabric对象的点击事件
      self._fabricCanvas.on('mouse:down', function(options) {
        if (options.target) {
          options.e.preventDefaultAction = true;
          options.e.preventDefault();
          options.e.stopPropagation();
        }
      });
      
      self._fabricCanvas.on('mouse:up', function(options) {
        if (options.target) {
          options.e.preventDefaultAction = true;
          options.e.preventDefault();
          options.e.stopPropagation();
        }
      });
      
      // 添加方法
      self.fabricCanvas = function() {
        return self._fabricCanvas;
      };
      
      self.clear = function() {
        self._fabricCanvas.clear();
      };
      
      self.render = function() {
        self._fabricCanvas.renderAll();
      };
      
      self.resize = function() {
        if (self._containerWidth !== viewer.container.clientWidth) {
          self._containerWidth = viewer.container.clientWidth;
          self._canvasdiv.setAttribute('width', self._containerWidth);
          self._canvas.setAttribute('width', self._containerWidth);
        }
        
        if (self._containerHeight !== viewer.container.clientHeight) {
          self._containerHeight = viewer.container.clientHeight;
          self._canvasdiv.setAttribute('height', self._containerHeight);
          self._canvas.setAttribute('height', self._containerHeight);
        }
      };
      
      // 更新viewport时重新调整canvas
      viewer.addHandler('update-viewport', function() {
        self.resize();
        self.resizeCanvas();
        self.render();
      });
      
      // 在动画过程中也更新
      viewer.addHandler('animation', function() {
        self.resize();
        self.resizeCanvas();
        self.render();
      });
      
      // 打开图像时调整大小
      viewer.addHandler('open', function() {
        self.resize();
        self.resizeCanvas();
        self.render();
      });
      
      self.resizeCanvas = function() {
        const viewportZoom = viewer.viewport.getZoom(true);
        const scale = options && options.scale ? options.scale : 1;
        
        self._fabricCanvas.setWidth(self._containerWidth);
        self._fabricCanvas.setHeight(self._containerHeight);
        
        const zoom = viewer.viewport._containerInnerSize.x * viewportZoom / scale;
        self._fabricCanvas.setZoom(zoom);
        
        const viewportWindowPoint = viewer.viewport.viewportToWindowCoordinates(new OpenSeadragon.Point(0, 0));
        const x = viewportWindowPoint.x;
        const y = viewportWindowPoint.y;
        const canvasOffset = self._canvasdiv.getBoundingClientRect();
        
        // 获取页面滚动位置
        const pageScroll = {
          x: window.pageXOffset || document.documentElement.scrollLeft,
          y: window.pageYOffset || document.documentElement.scrollTop
        };
        
        self._fabricCanvas.absolutePan(new fabric.Point(
          canvasOffset.left - x + pageScroll.x,
          canvasOffset.top - y + pageScroll.y
        ));
      };
      
      return self;
    };
    
    // 创建并返回Overlay实例
    this._fabricjsOverlayInfo = createOverlay(this, options && options.static);
    this._fabricjsOverlayInfo._scale = options && options.scale ? options.scale : 1;
    
    return this._fabricjsOverlayInfo;
  };
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app') 