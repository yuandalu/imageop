// 压缩相关工具函数

/**
 * 获取文件对应的压缩参数
 * 核心作用：为缓存策略提供精确的参数比较基础
 * 根据文件格式返回该格式相关的参数，实现"按需分配"策略
 * 避免不同格式的参数变化相互干扰，确保缓存策略的精确性
 * @param {File} file - 文件对象
 * @param {Object} settings - 全局设置
 * @param {Map} convertToJpeg - PNG转JPEG选项映射
 * @returns {Object} 该文件格式相关的压缩参数
 */
export const getFileCompressionSettings = (file, settings, convertToJpeg) => {
  const format = getFileType(file, 'format');
  const baseSettings = {
    lossy: settings.lossy,
    pngquantMin: settings.pngquantMin,
    pngquantMax: settings.pngquantMax,
    pngquantSpeed: settings.pngquantSpeed,
    jpegQuality: settings.jpegQuality,
    webpQuality: settings.webpQuality,
    // 分辨率调整参数
    resizeMode: settings.resizeMode,
    resizeWidth: settings.resizeWidth,
    resizeHeight: settings.resizeHeight,
    skipIfSmaller: settings.skipIfSmaller,
    fit: settings.fit
  };
  
  // 根据文件格式返回相关参数
  // 每个格式只包含自己相关的参数，避免无关参数影响缓存判断
  const formatSettings = {
    png: {
      lossy: baseSettings.lossy,
      pngquantMin: baseSettings.pngquantMin,
      pngquantMax: baseSettings.pngquantMax,
      pngquantSpeed: baseSettings.pngquantSpeed,
      convertToJpeg: convertToJpeg.get(file.name) || false, // 添加转换选项
      // 如果转换为JPEG，也要包含JPEG质量参数
      // 这样当用户调整JPEG质量时，PNG转JPEG的缓存会被正确检测为需要更新
      jpegQuality: convertToJpeg.get(file.name) ? baseSettings.jpegQuality : undefined,
      // 分辨率调整参数
      resizeMode: baseSettings.resizeMode,
      resizeWidth: baseSettings.resizeWidth,
      resizeHeight: baseSettings.resizeHeight,
      skipIfSmaller: baseSettings.skipIfSmaller,
      fit: baseSettings.fit
    },
    jpeg: {
      jpegQuality: baseSettings.jpegQuality,
      // 分辨率调整参数
      resizeMode: baseSettings.resizeMode,
      resizeWidth: baseSettings.resizeWidth,
      resizeHeight: baseSettings.resizeHeight,
      skipIfSmaller: baseSettings.skipIfSmaller,
      fit: baseSettings.fit
    },
    webp: {
      webpQuality: baseSettings.webpQuality,
      // 分辨率调整参数
      resizeMode: baseSettings.resizeMode,
      resizeWidth: baseSettings.resizeWidth,
      resizeHeight: baseSettings.resizeHeight,
      skipIfSmaller: baseSettings.skipIfSmaller,
      fit: baseSettings.fit
    }
  };
  
  return formatSettings[format] || baseSettings;
};

/**
 * 检查压缩参数是否改变
 * @param {File} file - 文件对象
 * @param {Object} settings - 全局设置
 * @param {Map} convertToJpeg - PNG转JPEG选项映射
 * @param {Map} compressionCache - 压缩缓存
 * @returns {boolean} 参数是否改变
 */
export const hasCompressionSettingsChanged = (file, settings, convertToJpeg, compressionCache) => {
  const fileId = getFileId(file);
  const currentSettings = getFileCompressionSettings(file, settings, convertToJpeg);
  const cachedSettings = compressionCache.get(fileId)?.settings;
  
  if (!cachedSettings) return true; // 没有缓存，需要压缩
  
  // 比较相关参数
  return Object.keys(currentSettings).some(key => 
    cachedSettings[key] !== currentSettings[key]
  );
};

/**
 * 获取压缩状态信息
 * @param {File} file - 文件对象
 * @param {Object} result - 压缩结果
 * @returns {Object} 压缩状态信息
 */
export const getCompressionStatus = (file, result) => {
  if (!result || !result.success) {
    return { status: 'pending', percentage: 0, color: '#6b7280' };
  }
  
  const originalSize = result.original.size;
  const compressedSize = result.compressed.size;
  const percentage = Math.round(((originalSize - compressedSize) / originalSize) * 100);
  
  if (percentage > 0) {
    return { status: 'compressed', percentage, color: '#10b981' };
  } else if (percentage < 0) {
    return { status: 'increased', percentage: Math.abs(percentage), color: '#f59e0b' };
  } else {
    return { status: 'no-change', percentage: 0, color: '#6b7280' };
  }
};

/**
 * 验证文件是否可读
 * @param {Array} files - 文件数组
 * @returns {Promise<Array>} 验证结果数组
 */
export const validateFiles = async (files) => {
  const fileValidationPromises = files.map(async (file, index) => {
    try {
      await tryReadFileHead(file);
      return { file, index, valid: true };
    } catch (error) {
      return { file, index, valid: false };
    }
  });
  return await Promise.all(fileValidationPromises);
};

/**
 * 分析哪些文件需要重新压缩
 * @param {Array} fileValidationResults - 文件验证结果
 * @param {Object} settings - 压缩设置
 * @param {Map} convertToJpeg - PNG转JPEG选项
 * @param {Map} compressionCache - 压缩缓存
 * @param {Function} removeFile - 移除文件函数
 * @returns {Object} 包含需要压缩的文件和缓存结果
 */
export const analyzeCompressionNeeds = (fileValidationResults, settings, convertToJpeg, compressionCache, removeFile) => {
  const filesToCompress = [];
  const cachedResults = [];
  
  fileValidationResults.forEach(({ file, index, valid }) => {
    if (!valid) {
      // 处理无效文件
      cachedResults[index] = {
        success: false,
        filename: file.name,
        error: '文件不存在或已损坏'
      };
      removeFile(index, true);
      return;
    }

    const fileId = getFileId(file);
    const needsCompression = hasCompressionSettingsChanged(file, settings, convertToJpeg, compressionCache);
    
    if (needsCompression) {
      console.log(`文件 ${file.name} 需要重新压缩`);
      filesToCompress.push({ file, index });
    } else {
      console.log(`文件 ${file.name} 使用缓存结果`);
      const cached = compressionCache.get(fileId);
      if (cached) {
        cachedResults[index] = {
          ...cached.result,
          _isCached: true
        };
      }
    }
  });
  
  return { filesToCompress, cachedResults };
};

/**
 * 构建压缩请求的FormData
 * @param {Array} filesToCompress - 需要压缩的文件
 * @param {Object} settings - 压缩设置
 * @param {Map} convertToJpeg - PNG转JPEG选项
 * @returns {FormData} 请求数据
 */
export const buildFormData = (filesToCompress, settings, convertToJpeg) => {
  const formData = new FormData();
  
  filesToCompress.forEach(({ file }) => {
    formData.append('images', file);
    if (convertToJpeg.get(file.name)) {
      formData.append('convertToJpeg', file.name);
    }
  });
  
  // 添加压缩参数
  formData.append('lossy', settings.lossy);
  formData.append('pngquantMin', settings.pngquantMin);
  formData.append('pngquantMax', settings.pngquantMax);
  formData.append('pngquantSpeed', settings.pngquantSpeed);
  formData.append('jpegQuality', settings.jpegQuality);
  formData.append('webpQuality', settings.webpQuality);
  formData.append('resizeMode', settings.resizeMode);
  formData.append('resizeWidth', settings.resizeWidth);
  formData.append('resizeHeight', settings.resizeHeight);
  formData.append('skipIfSmaller', settings.skipIfSmaller);
  formData.append('fit', settings.fit);
  
  return formData;
};

/**
 * 处理压缩响应并更新缓存
 * @param {Object} response - 压缩响应
 * @param {Array} filesToCompress - 需要压缩的文件
 * @param {Array} files - 所有文件
 * @param {Object} settings - 压缩设置
 * @param {Map} convertToJpeg - PNG转JPEG选项
 * @param {Function} setCompressionCache - 设置缓存函数
 * @returns {Array} 压缩结果数组
 */
export const processCompressionResponse = (response, filesToCompress, files, settings, convertToJpeg, setCompressionCache) => {
  const newResults = [];
  
  response.data.results.forEach((result, resultIndex) => {
    const { index: fileIndex } = filesToCompress[resultIndex];
    newResults[fileIndex] = result;
    
    // 更新缓存
    const file = files[fileIndex];
    const fileId = getFileId(file);
    const currentSettings = getFileCompressionSettings(file, settings, convertToJpeg);
    
    setCompressionCache(prev => {
      const newCache = new Map(prev);
      newCache.set(fileId, {
        result: result,
        settings: currentSettings
      });
      return newCache;
    });
  });
  
  return newResults;
};

/**
 * 生成成功消息
 * @param {Array} results - 压缩结果数组
 * @returns {string} 成功消息
 */
export const generateSuccessMessage = (results) => {
  const compressedCount = results.filter(r => r && r.success && !r._isCached).length;
  const cachedCount = results.filter(r => r && r._isCached).length;
  const errorCount = results.filter(r => r && !r.success).length;
  
  if (errorCount > 0) {
    return `处理完成：压缩 ${compressedCount} 张，缓存 ${cachedCount} 张，错误 ${errorCount} 张`;
  } else if (cachedCount > 0 && compressedCount > 0) {
    return `成功压缩 ${compressedCount} 张图片（${cachedCount} 张使用缓存）`;
  } else if (cachedCount > 0) {
    return `所有 ${cachedCount} 张图片都使用缓存结果`;
  } else {
    return `成功压缩 ${compressedCount} 张图片`;
  }
};

/**
 * 执行压缩请求
 * @param {FormData} formData - 请求数据
 * @returns {Promise<Object>} 压缩响应
 */
export const executeCompressionRequest = async (formData) => {
  const response = await axios.post(API_ENDPOINTS.COMPRESS_BATCH, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response;
};

// 导入需要的工具函数
import { getFileType, getFileId, tryReadFileHead } from './fileUtils.js';
import { API_ENDPOINTS } from './constants.js';
import axios from 'axios';
