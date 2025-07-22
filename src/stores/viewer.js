import { defineStore } from 'pinia'
import OpenSeadragon from 'openseadragon'

export const useViewerStore = defineStore('viewer', {
  state: () => ({
    // 布局类型（1/2/4/9/16图模式，以及101:左大右小，102:右大左小）
    layoutType: 1,
    
    // 查看器实例数组
    viewers: [],
    
    // 选中的查看器索引
    selectedViewerIndex: null,
    
    // 各查看器加载的文件名
    viewerFileNames: [],
    
    // 是否正在同步缩放/平移
    isSyncing: false,
    
    // 分页相关
    currentPage: 1,
    totalImages: 0,
    currentDisplayedImages: [],
    allImageFiles: []
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
      let viewerCount = this.layoutType;
      
      // 对于特殊布局，设置合适的查看器数量
      if (this.layoutType === 101) { // 左大右小模式
        viewerCount = 5; // 1个大图 + 4个小图
      } else if (this.layoutType === 102) { // 右大左小模式
        viewerCount = 5; // 4个小图 + 1个大图
      }
      
      for (let i = 0; i < viewerCount; i++) {
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
        prefixUrl: '/openseadragon-bin/images/',
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
        // 索引小于7的使用WebGL，大于等于7的使用canvas
        drawer: this.selectedViewerIndex < 7 ? 'webgl' : 'canvas',
        gestureSettingsMouse: {
          scrollToZoom: true
        },
        showNavigator: false,
        fullscreen: false,
        // 添加自动调整视口的配置
        autoResize: true,
        defaultZoomLevel: 0,
        maxZoomPixelRatio: 2,
        minZoomLevel: 0.1,
        visibilityRatio: 0.9,
        homeFillsViewer: true
      })
      
      // 添加图像打开事件处理器，只在高度方向铺满
      this.viewers[this.selectedViewerIndex].addHandler('open', (event) => {
        const viewer = this.viewers[this.selectedViewerIndex];
        // 使用goHome方法实现类似于点击"回归中心"按钮的效果
        viewer.viewport.goHome(true);
      })
      
      // 默认启用同步
      this.setupSync()
      
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
        prefixUrl: '/openseadragon-bin/images/',
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
        // 索引小于7的使用WebGL，大于等于7的使用canvas
        drawer: index < 7 ? 'webgl' : 'canvas',
        gestureSettingsMouse: {
          scrollToZoom: true
        },
        showNavigator: false,
        fullscreen: false,
        // 添加自动调整视口的配置
        autoResize: true,
        defaultZoomLevel: 0,
        maxZoomPixelRatio: 2,
        minZoomLevel: 0.1,
        visibilityRatio: 0.9,
        homeFillsViewer: true
      })
      
      // 添加图像打开事件处理器，只在高度方向铺满
      this.viewers[index].addHandler('open', (event) => {
        const viewer = this.viewers[index];
        // 使用goHome方法实现类似于点击"回归中心"按钮的效果
        viewer.viewport.goHome(true);
      })
      
      // 默认启用同步
      this.setupSync()
      
      return true
    },
    
    /**
     * 清除指定索引位置的查看器
     * @param {number} index - 查看器索引
     */
    clearViewerAtIndex(index) {
      // 检查索引是否有效
      if (index < 0 || index >= this.viewers.length) {
        console.error(`无效的查看器索引: ${index}`)
        return false
      }
      
      // 销毁现有查看器
      if (this.viewers[index]) {
        this.viewers[index].destroy()
        this.viewers[index] = null
        this.viewerFileNames[index] = ''
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
            if (!this.isSyncing) {
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
            if (!this.isSyncing) {
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
          
          // 添加图像打开事件，确保图像加载后立即铺满视图
          viewer.addHandler('open', () => {
            // 延迟一点点执行以确保图像完全加载
            setTimeout(() => {
              // 使用goHome方法实现类似于点击"回归中心"按钮的效果
              viewer.viewport.goHome(true);
            }, 100);
          });
          
          // 标记已添加同步处理器
          viewer._syncHandlersBound = true
        }
      })
    },
    
    /**
     * 切换布局模式
     * @param {number} num - 布局类型（1/2/4/9/16 或特殊布局 101/102）
     */
    changeLayout(num) {
      this.layoutType = num
      this.selectedViewerIndex = null
      this.initViewers()
      
      // 重置分页
      this.currentPage = 1
      
      // 如果有已加载的图像文件，重新显示第一页
      if (this.allImageFiles.length > 0) {
        this.displayImagesByPage(1)
      }
    },
    
    /**
     * 设置所有可用的图像文件
     * @param {Array} files - 所有图像文件数组
     */
    setAllImageFiles(files) {
      this.allImageFiles = files
      this.totalImages = files.length
      this.currentPage = 1
      
      // 自动显示第一页
      if (files.length > 0) {
        this.displayImagesByPage(1)
      }
    },
    
    /**
     * 根据页码显示图像
     * @param {number} page - 页码
     */
    displayImagesByPage(page) {
      // 计算每页显示的图像数量（基于当前布局）
      let imagesPerPage = this.layoutType
      
      // 特殊布局处理
      if (this.layoutType === 101 || this.layoutType === 102) {
        imagesPerPage = 5 // 左大右小或右大左小布局固定为5个查看器
      }
      
      // 计算总页数
      const totalPages = Math.ceil(this.allImageFiles.length / imagesPerPage)
      
      // 验证页码有效性
      if (page < 1 || page > totalPages) {
        console.error(`无效的页码: ${page}，有效范围: 1-${totalPages}`)
        return false
      }
      
      // 计算当前页的起始索引和结束索引
      const startIndex = (page - 1) * imagesPerPage
      const endIndex = Math.min(startIndex + imagesPerPage, this.allImageFiles.length)
      
      // 获取当前页的图像
      const pageImages = this.allImageFiles.slice(startIndex, endIndex)
      this.currentDisplayedImages = pageImages
      
      // 清除所有查看器
      this.viewers.forEach((viewer, index) => {
        if (viewer) {
          viewer.destroy()
          this.viewers[index] = null
          this.viewerFileNames[index] = ''
        }
      })
      
      // 加载当前页的图像
      pageImages.forEach((image, index) => {
        this.updateViewerAtIndex(index, image.url, image.name)
      })
      
      // 更新当前页码
      this.currentPage = page
      
      return true
    },
    
    /**
     * 显示下一页图像
     */
    nextPage() {
      // 计算每页显示的图像数量
      let imagesPerPage = this.layoutType
      
      // 特殊布局处理
      if (this.layoutType === 101 || this.layoutType === 102) {
        imagesPerPage = 5
      }
      
      // 计算总页数
      const totalPages = Math.ceil(this.allImageFiles.length / imagesPerPage)
      
      // 如果当前已经是最后一页，则不执行操作
      if (this.currentPage >= totalPages) {
        return false
      }
      
      // 显示下一页
      return this.displayImagesByPage(this.currentPage + 1)
    },
    
    /**
     * 显示上一页图像
     */
    prevPage() {
      // 如果当前已经是第一页，则不执行操作
      if (this.currentPage <= 1) {
        return false
      }
      
      // 显示上一页
      return this.displayImagesByPage(this.currentPage - 1)
    },
    
    /**
     * 获取分页信息
     */
    getPaginationInfo() {
      // 计算每页显示的图像数量
      let imagesPerPage = this.layoutType
      
      // 特殊布局处理
      if (this.layoutType === 101 || this.layoutType === 102) {
        imagesPerPage = 5
      }
      
      // 计算总页数
      const totalPages = Math.ceil(this.allImageFiles.length / imagesPerPage)
      
      return {
        currentPage: this.currentPage,
        totalPages,
        totalImages: this.totalImages,
        imagesPerPage,
        hasNextPage: this.currentPage < totalPages,
        hasPrevPage: this.currentPage > 1
      }
    }
  }
})