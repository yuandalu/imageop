import React, { useState, useEffect } from 'react';
import { formatFileSize, getFileType, getImageDimensions, getCompressionStatus } from '../utils';

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


export default FileInfo;
