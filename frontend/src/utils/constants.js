// 应用常量定义

/**
 * 支持的文件类型
 */
export const SUPPORTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/bmp': ['.bmp'],
  'image/webp': ['.webp']
};

/**
 * 文件上传限制
 */
export const UPLOAD_LIMITS = {
  MAX_FILES: 100,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/webp']
};

/**
 * 压缩设置默认值
 */
export const DEFAULT_COMPRESSION_SETTINGS = {
  // PNG 压缩参数
  lossy: true,  // 启用有损压缩以获得最佳效果
  pngquantMin: 60,  // pngquant 最小质量
  pngquantMax: 80,  // pngquant 最大质量
  pngquantSpeed: 3,  // pngquant 速度 (1-11)
  // JPEG 压缩参数
  jpegQuality: 60,  // JPEG 质量 (60-95)
  // WebP 压缩参数
  webpQuality: 60,   // WebP 质量 (60-95)
  // 分辨率调整参数
  resizeMode: 'keep',  // 调整模式：keep, custom, maxWidth, maxHeight
  resizeWidth: 300,    // 目标宽度
  resizeHeight: 200,   // 目标高度
  skipIfSmaller: false, // 小于当前尺寸不处理
  fit: 'cover'         // 缩放规则：cover, contain, fill
};

/**
 * 压缩质量范围
 */
export const QUALITY_RANGES = {
  PNG_MIN: 1,
  PNG_MAX: 100,
  JPEG_MIN: 60,
  JPEG_MAX: 95,
  WEBP_MIN: 60,
  WEBP_MAX: 95,
  PNGQUANT_SPEED_MIN: 1,
  PNGQUANT_SPEED_MAX: 11
};

/**
 * 分辨率调整模式选项
 */
export const RESIZE_MODES = [
  { value: 'keep', label: '保持原尺寸' },
  { value: 'custom', label: '自定义尺寸' },
  { value: 'maxWidth', label: '按宽度缩放' },
  { value: 'maxHeight', label: '按高度缩放' }
];

/**
 * 缩放规则选项
 */
export const FIT_OPTIONS = [
  { value: 'cover', label: '裁剪填充' },
  { value: 'contain', label: '完整显示' },
  { value: 'fill', label: '强制拉伸' }
];

/**
 * 消息显示时间
 */
export const MESSAGE_TIMEOUTS = {
  SUCCESS: 4000,  // 成功消息显示4秒
  ERROR: 3000,    // 错误消息显示3秒
  INFO: 2000      // 信息消息显示2秒
};

/**
 * API 端点
 */
export const API_ENDPOINTS = {
  COMPRESS_BATCH: './api/compress/batch'
};
