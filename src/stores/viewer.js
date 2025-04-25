import { defineStore } from 'pinia'
import OpenSeadragon from 'openseadragon'

export const useViewerStore = defineStore('viewer', {
  state: () => ({
    // 布局类型（1/2/4/9图模式）
    layoutType: 1,
    
    // 同步功能开关
    syncEnabled: true,
    
    // 查看器实例数组
    viewers: [],
    
    // 选中的查看器索引
    selectedViewerIndex: null,
    
    // 各查看器加载的文件名
    viewerFileNames: [],
    
    // 是否正在同步缩放/平移
    isSyncing: false
  }),
  
  actions: {
    /**
     * 初始化所有查看器
     */
    initViewers() {
      // 清理现有查看器
      this.viewers.forEach(v => v && v.destroy())
      this.viewers = []
      this.viewerFileNames = []
      
      // 根据布局创建新的查看器数组
      for (let i = 0; i < this.layoutType; i++) {
        this.viewers.push(null)
        this.viewerFileNames.push('')
      }
    },
    
    /**
     * 更新指定查看器的DZI URL
     * @param {string} url - DZI资源URL
     * @param {string} fileName - 文件名
     */
    updateViewerDziUrl(url, fileName) {
      if (this.selectedViewerIndex === null) {
        return false
      }
      
      // 销毁现有查看器
      if (this.viewers[this.selectedViewerIndex]) {
        this.viewers[this.selectedViewerIndex].destroy()
      }
      
      // 更新文件名
      this.viewerFileNames[this.selectedViewerIndex] = fileName
      
      // 创建新查看器
      this.viewers[this.selectedViewerIndex] = OpenSeadragon({
        id: `osdViewer-${this.selectedViewerIndex}`,
        prefixUrl: 'http://localhost:8080/openseadragon-bin/images/',
        tileSources: {
          Image: {
            xmlns: "http://schemas.microsoft.com/deepzoom/2008",
            Url: url,
            Overlap: "1",
            TileSize: "254",
            Format: "jpeg",
            Size: { Height: "32893", Width: "46000" }
          }
        },
        gestureSettingsMouse: {
          scrollToZoom: true
        },
        showNavigator: true,
        fullscreen: false
      })
      
      // 如果启用了同步，则设置同步处理
      if (this.syncEnabled) {
        this.setupSync()
      }
      
      return true
    },
    
    /**
     * 在指定索引位置更新查看器
     * @param {number} index - 查看器索引
     * @param {string} url - DZI资源URL
     * @param {string} fileName - 文件名
     */
    updateViewerAtIndex(index, url, fileName) {
      // 检查索引是否有效
      if (index < 0 || index >= this.viewers.length) {
        console.error(`无效的查看器索引: ${index}`)
        return false
      }
      
      // 销毁现有查看器
      if (this.viewers[index]) {
        this.viewers[index].destroy()
      }
      
      // 更新文件名
      this.viewerFileNames[index] = fileName
      
      // 创建新查看器
      this.viewers[index] = OpenSeadragon({
        id: `osdViewer-${index}`,
        prefixUrl: 'http://localhost:8080/openseadragon-bin/images/',
        tileSources: {
          Image: {
            xmlns: "http://schemas.microsoft.com/deepzoom/2008",
            Url: url,
            Overlap: "1",
            TileSize: "254",
            Format: "jpeg",
            Size: { Height: "32893", Width: "46000" }
          }
        },
        gestureSettingsMouse: {
          scrollToZoom: true
        },
        showNavigator: true,
        fullscreen: false
      })
      
      // 如果启用了同步，则设置同步处理
      if (this.syncEnabled) {
        this.setupSync()
      }
      
      return true
    },
    
    /**
     * 设置查看器同步
     */
    setupSync() {
      this.viewers.forEach((viewer, idx) => {
        if (viewer && !viewer._syncHandlersBound) {
          // 缩放同步
          viewer.addHandler('zoom', () => {
            if (this.syncEnabled && !this.isSyncing) {
              this.isSyncing = true
              const zoom = viewer.viewport.getZoom()
              this.viewers.forEach((v) => {
                if (v !== viewer && v) {
                  v.viewport.zoomTo(zoom)
                }
              })
              this.isSyncing = false
            }
          })
          
          // 平移同步
          viewer.addHandler('pan', () => {
            if (this.syncEnabled && !this.isSyncing) {
              this.isSyncing = true
              const center = viewer.viewport.getCenter()
              this.viewers.forEach((v) => {
                if (v !== viewer && v) {
                  v.viewport.panTo(center)
                }
              })
              this.isSyncing = false
            }
          })
          
          // 标记已添加同步处理器
          viewer._syncHandlersBound = true
        }
      })
    },
    
    /**
     * 切换同步功能
     */
    toggleSync() {
      this.syncEnabled = !this.syncEnabled
      if (this.syncEnabled) {
        this.setupSync()
      }
    },
    
    /**
     * 切换布局模式
     * @param {number} num - 布局类型（1/2/4/9）
     */
    changeLayout(num) {
      this.layoutType = num
      this.selectedViewerIndex = null
      this.initViewers()
    }
  }
}) 