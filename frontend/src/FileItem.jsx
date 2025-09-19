import React, { useState, useCallback } from 'react';
import { Eye, Download } from 'lucide-react';
import FileThumbnail from './FileThumbnail';
import FileInfo from './FileInfo';
import { getCompressionStatus } from './utils';

// 独立的文件项组件
const FileItem = React.memo(({ 
  file, 
  index, 
  result, 
  convertToJpeg,
  onRemove, 
  onConvertToJpeg,
  onPreview,
  onDownloadSingle,
  onErrorModal
}) => {
  // 检查是否为PNG文件
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  
  // 处理预览点击
  const handlePreviewClick = useCallback(() => {
    if (result && result.success) {
      // 有压缩结果，显示对比界面
      onPreview(result);
    } else {
      // 没有压缩结果，显示原图预览
      onPreview({
        success: true,
        original: {
          filename: file.name,
          size: file.size,
          dimensions: '未知尺寸',
          format: file.type.split('/')[1]?.toUpperCase() || 'UNKNOWN'
        },
        compressed: {
          filename: file.name,
          size: file.size,
          compressionRatio: 0
        },
        downloadUrl: URL.createObjectURL(file),
        originalUrl: URL.createObjectURL(file)
      });
    }
  }, [result, file, onPreview]);

  // 处理转换选项变化
  const handleConvertChange = useCallback((e) => {
    onConvertToJpeg(file.name, e.target.checked);
  }, [file.name, onConvertToJpeg]);

  // 处理删除
  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    onRemove(index);
  }, [index, onRemove]);

  // 处理预览按钮点击
  const handlePreviewButtonClick = useCallback(() => {
    onPreview(result);
  }, [result, onPreview]);

  // 处理下载按钮点击
  const handleDownloadClick = useCallback(() => {
    onDownloadSingle(result);
  }, [result, onDownloadSingle]);

  return (
    <div className="file-item">
      {/* 删除按钮 */}
      <button 
        className="file-remove-btn" 
        onClick={handleRemove}
        title="移除文件"
      >
        ×
      </button>
      
      {isPng && (
        <div className="convert-option">
          <label className="convert-checkbox">
            <input
              type="checkbox"
              checked={convertToJpeg || false}
              onChange={handleConvertChange}
            />
            <span className="convert-label">转JPEG</span>
          </label>
        </div>
      )}
      
      <div className="file-preview" onClick={handlePreviewClick} style={{ cursor: 'pointer' }}>
        <FileThumbnail file={file} />
        <div className="file-name">{file.name}</div>
      </div>
      
      <div className="file-details">
        <FileInfo file={file} result={result} onErrorModal={onErrorModal} />
        
        <div className="file-actions">
          {result && result.success ? (
            <>
              <button className="btn-preview" onClick={handlePreviewButtonClick}>
                <Eye style={{ width: '12px', height: '12px' }} />
              </button>
              {result.compressed && result.compressed.compressionRatio > 0 ? (
                <button className="btn-download" onClick={handleDownloadClick}>
                  <Download style={{ width: '12px', height: '12px' }} />
                </button>
              ) : null}
              <div 
                className="compression-percentage"
                style={{ color: getCompressionStatus(file, result).color }}
              >
                {getCompressionStatus(file, result).status === 'compressed' && '-'}
                {getCompressionStatus(file, result).status === 'increased' && '+'}
                {getCompressionStatus(file, result).percentage}%
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
});


export default FileItem;
