import React, { useState, useEffect } from 'react';

// 文件信息组件
const FileInfo = React.memo(({ file, result, onErrorModal }) => {
  const [dimensions, setDimensions] = useState('加载中...');

  useEffect(() => {
    // 如果有压缩结果，使用服务器返回的尺寸
    if (result?.original?.dimensions) {
      setDimensions(result.original.dimensions);
    } else {
      // 否则从文件获取尺寸
      getImageDimensions(file).then(setDimensions);
    }
  }, [file, result]);

  // 检查是否使用缓存
  const isCached = result?._isCached || false;

  // 确保所有值都是字符串
  const fileType = getFileType(file);
  const fileSize = formatFileSize(file.size);
  const compressedFormat = result?.original?.format?.toUpperCase() || 'PNG';
  const compressedSize = result?.compressed?.size ? formatFileSize(result.compressed.size) : '';

  // 检查是否进行了格式转换（只有在真正转换完成后才显示）
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  const wasConverted = isPng && result?.success && result?.convertedToJpeg;
  const displayFormat = wasConverted ? 'JPEG' : compressedFormat;

  // 获取压缩状态
  const compressionStatus = getCompressionStatus(file, result);

  return (
    <div className="file-info">
      <div className="file-info-item">
        <span className="file-info-label">尺寸</span>
        <span className="file-info-value">{dimensions}</span>
      </div>
      <div className="file-info-item">
        <span className="file-info-label">原图</span>
        <span className="file-info-value">
          {fileType} {fileSize}
          {wasConverted && <span className="convert-arrow-icon">↓</span>}
        </span>
      </div>
      {result && result.success ? (
        <div className="file-info-item">
          <span className="file-info-label">压缩后</span>
          <span 
            className="file-info-value"
            style={{ color: compressionStatus.color }}
          >
            {displayFormat} {compressedSize}
            {isCached && <span className="cache-indicator"> (缓存)</span>}
          </span>
        </div>
      ) : result && result.success === false ? (
        <div className="file-info-item">
          <span className="file-info-label">压缩后</span>
          <div className="error-display">
            <span className="error-status">❌ 失败</span>
            <button 
              className="error-details-btn"
              onClick={() => {
                console.log('点击查看详情按钮', { error: result.error, filename: file.name });
                onErrorModal({ 
                  show: true, 
                  error: result.error, 
                  filename: file.name 
                });
              }}
            >
              详情
            </button>
          </div>
        </div>
      ) : (
        <div className="file-info-item">
          <span className="file-info-label">压缩后</span>
          <span className="file-info-value">等待压缩...</span>
        </div>
      )}
    </div>
  );
});

// 辅助函数（从原代码复制）
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileType = (file, format = 'display') => {
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
  return format === 'display' ? 'UNKNOWN' : 'unknown';
};

const getImageDimensions = (file) => {
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

const getCompressionStatus = (file, result) => {
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

export default FileInfo;
