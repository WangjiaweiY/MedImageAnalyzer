/**
 * API 服务层 - 封装所有API调用，统一处理错误和格式转换
 */
import { useUserStore } from '@/stores/user';

// 基础错误处理
const handleError = (error, customMessage = '请求失败') => {
  console.error(`API Error: ${customMessage}`, error);
  
  // 如果是401错误，可能是token过期，清除用户信息并跳转到登录页
  if (error.status === 401) {
    const userStore = useUserStore();
    userStore.clearUserData();
    window.location.href = '/';
  }
  
  return Promise.reject({
    message: customMessage,
    originalError: error
  });
};

// 获取带有授权头的请求选项
const getAuthOptions = (options = {}) => {
  const userStore = useUserStore();
  const headers = {
    ...options.headers || {},
    ...userStore.getAuthHeader()
  };
  
  return {
    ...options,
    headers
  };
};

// 文件目录相关API
export const fileApi = {
  // 获取所有文件夹列表
  getFolderList: async () => {
    try {
      const res = await fetch('/api/dzi/list', getAuthOptions());
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '获取文件列表失败');
    }
  },
  
  // 获取指定文件夹内的文件列表
  getFilesByFolder: async (folderName) => {
    try {
      const res = await fetch(`/api/dzi/list/${folderName}`, getAuthOptions());
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, `获取文件夹 ${folderName} 内容失败`);
    }
  },
  
  // 删除文件夹
  deleteFolder: async (folderName) => {
    try {
      const res = await fetch(`/api/dzi/deleteFolder/${folderName}`, getAuthOptions({
        method: 'DELETE'
      }));
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return true;
    } catch (error) {
      return handleError(error, `删除文件夹 ${folderName} 失败`);
    }
  },
  
  // 删除文件
  deleteFile: async (folderName, fileName) => {
    try {
      const res = await fetch(`/api/dzi/delete/${folderName}/${fileName}`, getAuthOptions({
        method: 'DELETE'
      }));
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return true;
    } catch (error) {
      return handleError(error, `删除文件 ${fileName} 失败`);
    }
  },
  
  // 上传文件夹
  uploadFolder: async (formData) => {
    try {
      const response = await fetch("/api/svs/upload", getAuthOptions({
        method: 'POST',
        body: formData
      }));
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
      const res = await fetch("/api/svs/list", getAuthOptions());
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
      // 根据新的API文档，使用查询参数传递folder
      const res = await fetch(`/api/svs/submit?folder=${encodeURIComponent(folderName)}`, getAuthOptions({
        method: 'POST'
      }));
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      return await res.json();
    } catch (error) {
      return handleError(error, '图像配准失败');
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.message || '登录失败' };
      }
      
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, message: errorData.message || '注册失败' };
      }
      
      return await response.json();
    } catch (error) {
      return handleError(error, '注册失败');
    }
  },
  
  // 验证当前token是否有效
  validateToken: async () => {
    try {
      const response = await fetch('/api/user/validate', getAuthOptions());
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}; 

// 通用API请求方法
export default {
  /**
   * 发送GET请求
   * @param {String} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise} - 返回Promise
   */
  get(endpoint) {
    return fetch(`/api${endpoint}`, getAuthOptions())
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
      })
      .catch(error => handleError(error, `GET请求 ${endpoint} 失败`));
  },

  /**
   * 发送POST请求
   * @param {String} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 额外的请求选项
   * @returns {Promise} - 返回Promise
   */
  post(endpoint, data, options = {}) {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // 只有当数据不为null时才添加body
    if (data !== null && data !== undefined) {
      requestOptions.body = JSON.stringify(data);
    }

    return fetch(`/api${endpoint}`, getAuthOptions(requestOptions))
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        return response.json();
      })
      .catch(error => handleError(error, `POST请求 ${endpoint} 失败`));
  },

  /**
   * 发送PUT请求
   * @param {String} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 额外的请求选项
   * @returns {Promise} - 返回Promise
   */
  put(endpoint, data, options = {}) {
    return fetch(`/api${endpoint}`, getAuthOptions({
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    }))
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return response.json();
    })
    .catch(error => handleError(error, `PUT请求 ${endpoint} 失败`));
  },

  /**
   * 发送DELETE请求
   * @param {String} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise} - 返回Promise
   */
  delete(endpoint, options = {}) {
    return fetch(`/api${endpoint}`, getAuthOptions({
      method: 'DELETE',
      ...options
    }))
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      return response.json();
    })
    .catch(error => handleError(error, `DELETE请求 ${endpoint} 失败`));
  }
}; 