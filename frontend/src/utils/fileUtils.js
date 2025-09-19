// 文件相关工具函数

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @param {number} decimals - 小数位数，默认为1
 * @returns {string} 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes, decimals = 1) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * 获取文件类型
 * @param {File} file - 文件对象
 * @param {string} format - 返回格式：'display' 返回大写，'format' 返回小写
 * @returns {string} 文件类型
 */
export const getFileType = (file, format = 'display') => {
  if (!file || !file.type) return format === 'display' ? 'UNKNOWN' : 'unknown';
  const type = file.type.toLowerCase();
  
  if (type.includes('jpeg') || type.includes('jpg')) {
    return format === 'display' ? 'JPEG' : 'jpeg';
  }
  if (type.includes('png')) {
    return format === 'display' ? 'PNG' : 'png';
  }
  if (type.includes('webp')) {
    return format === 'display' ? 'WEBP' : 'webp';
  }
  if (type.includes('bmp')) {
    return format === 'display' ? 'BMP' : 'bmp';
  }
  return format === 'display' ? 'UNKNOWN' : 'unknown';
};

/**
 * 生成文件唯一标识符
 * @param {File} file - 文件对象
 * @returns {string} 文件唯一ID
 */
export const getFileId = (file) => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};

/**
 * 获取图片尺寸
 * @param {File} file - 图片文件
 * @returns {Promise<string>} 图片尺寸字符串，格式为 "宽x高"
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        resolve(`${img.width}x${img.height}`);
      };
      img.onerror = () => {
        resolve('未知尺寸');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      resolve('未知尺寸');
    };
    reader.readAsDataURL(file);
  });
};

/**
 * 检查文件是否为PNG格式
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为PNG文件
 */
export const isPngFile = (file) => {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
};

/**
 * 检查文件是否为图片格式
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为图片文件
 */
export const isImageFile = (file) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp'];
  return imageTypes.includes(file.type);
};

/**
 * 检查文件是否可读（通过读取文件头部）
 * @param {File} file - 文件对象
 * @returns {Promise<boolean>} 文件是否可读
 */
export const tryReadFileHead = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(true);
    reader.onerror = () => reject(false);
    try {
      // 只读取前1个字节
      const blob = file.slice(0, 1);
      reader.readAsArrayBuffer(blob);
    } catch (e) {
      reject(false);
    }
  });
};
