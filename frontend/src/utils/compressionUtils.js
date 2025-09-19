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

// 导入需要的工具函数
import { getFileType, getFileId } from './fileUtils.js';
