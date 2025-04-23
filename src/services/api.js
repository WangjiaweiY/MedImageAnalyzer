/**
 * API 服务层 - 封装所有API调用，统一处理错误和格式转换
 */

// 基础错误处理
const handleError = (error, customMessage = '请求失败') => {
  console.error(`API Error: ${customMessage}`, error);
  return Promise.reject({
    message: customMessage,
    originalError: error
  });
};

// 文件目录相关API
export const fileApi = {
  // 获取所有文件夹列表
  getFolderList: async () => {
    try {
      const res = await fetch('/api/dzi/list');
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '获取文件列表失败');
    }
  },
  
  // 获取指定文件夹内的文件列表
  getFilesByFolder: async (folderName) => {
    try {
      const res = await fetch(`/api/dzi/list/${folderName}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, `获取文件夹 ${folderName} 内容失败`);
    }
  },
  
  // 删除文件夹
  deleteFolder: async (folderName) => {
    try {
      const res = await fetch(`/api/dzi/deleteFolder/${folderName}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return true;
    } catch (error) {
      return handleError(error, `删除文件夹 ${folderName} 失败`);
    }
  },
  
  // 删除文件
  deleteFile: async (folderName, fileName) => {
    try {
      const res = await fetch(`/api/dzi/delete/${folderName}/${fileName}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return true;
    } catch (error) {
      return handleError(error, `删除文件 ${fileName} 失败`);
    }
  },
  
  // 上传文件夹
  uploadFolder: async (formData) => {
    try {
      const response = await fetch("/api/svs/upload", {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleError(error, '上传文件夹失败');
    }
  }
};

// 图像处理相关API
export const imageApi = {
  // 获取所有可配准的文件夹列表
  getRegistrationFolderList: async () => {
    try {
      const res = await fetch("/api/svs/list");
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const result = await res.json();
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      return handleError(error, '获取配准文件夹列表失败');
    }
  },
  
  // 开始配准
  startRegistration: async (folderName, username) => {
    try {
      const res = await fetch(`/api/svs/register/${folderName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username })
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return true;
    } catch (error) {
      return handleError(error, '图像配准失败');
    }
  },
  
  // 免疫组化分析
  analyzeIHC: async (folderName, fileName) => {
    try {
      const url = `/api/ihc/analyze?folderName=${encodeURIComponent(folderName)}&fileName=${encodeURIComponent(fileName)}`;
      const response = await fetch(url, {
        method: 'POST',
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleError(error, '免疫组化分析失败');
    }
  },
  
  // 查询文件夹分析结果
  getFolderAnalysisResult: async (folderName) => {
    try {
      const res = await fetch(`/api/ihc/resultfolder?folderName=${encodeURIComponent(folderName)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '查询文件夹分析结果失败');
    }
  },
  
  // 查询单个图片分析结果
  getFileAnalysisResult: async (folderName, fileName) => {
    try {
      console.log(111)
      const res = await fetch(`/api/ihc/result?folderName=${encodeURIComponent(folderName)}&fileName=${encodeURIComponent(fileName)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '查询图片分析结果失败');
    }
  },
  
  // Fullnet分析
  analyzeFullnet: async (folderName, fileName) => {
    try {
      const filename = `${folderName}/${fileName}`;
      const response = await fetch('/api/fullnet/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filename })
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleError(error, 'Fullnet分析失败');
    }
  },
  
  // 查询Fullnet分析任务状态
  getFullnetTaskStatus: async (taskId) => {
    try {
      const res = await fetch(`/api/fullnet/task/${taskId}`);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '查询分析任务状态失败');
    }
  },
  
  // 获取单个Fullnet分析结果
  getFullnetResult: async (fileName) => {
    try {
      const res = await fetch(`/api/fullnet/result?filename=${encodeURIComponent(fileName)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '获取Fullnet分析结果失败');
    }
  },
  
  // 获取所有Fullnet分析结果
  getAllFullnetResults: async () => {
    try {
      const res = await fetch('/api/fullnet/results');
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '获取所有Fullnet分析结果失败');
    }
  }
};

// 用户认证相关API
export const authApi = {
  // 用户登录
  login: async (username, password) => {
    try {
      const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleError(error, '登录失败');
    }
  },
  
  // 用户注册
  register: async (username, password) => {
    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return await response.json();
    } catch (error) {
      return handleError(error, '注册失败');
    }
  }
}; 