import React, { useState, useRef, useEffect } from 'react';
import { Download } from 'lucide-react';
import { formatFileSize } from '../utils';

// 预览模态框组件
const PreviewModal = ({ result, onClose, onDownloadSingle }) => {
  const [sliderPosition, setSliderPosition] = useState(50); // 滑块位置 (0-100)
  const [isDragging, setIsDragging] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(50); // 画布高度百分比 (0-100)，将在图片加载后更新
  const [isVerticalDragging, setIsVerticalDragging] = useState(false);
  const [imageNaturalHeight, setImageNaturalHeight] = useState(null); // 图片原始高度
  const comparisonRef = useRef(null);
  const previewRef = useRef(null);
  const imageRef = useRef(null);

  // 开始水平拖动对比滑块
  const handleMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  // 处理水平拖动对比滑块
  const handleMouseMove = (e) => {
    if (!isDragging || !comparisonRef.current) return;
    
    const rect = comparisonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  // 结束水平拖动
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 开始垂直拖动画布高度
  const handleVerticalMouseDown = (e) => {
    setIsVerticalDragging(true);
    e.preventDefault();
  };

  // 处理垂直拖动画布高度
  const handleVerticalMouseMove = (e) => {
    if (!isVerticalDragging || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // 计算在滑条范围内的相对位置 (0-1)
    const sliderTop = rect.top + (rect.height - rect.height * 0.6) / 2; // 滑条顶部位置
    const sliderHeight = rect.height * 0.6; // 滑条高度
    const relativeY = y - (sliderTop - rect.top);
    const sliderProgress = Math.max(0, Math.min(1, relativeY / sliderHeight));
    
    // 将滑条进度映射到画布高度范围，并应用最小高度限制
    let targetHeight;
    if (imageNaturalHeight !== null) {
      // 映射到 5% 到 imageNaturalHeight 的范围
      const minHeight = 5;
      const maxHeight = imageNaturalHeight;
      targetHeight = minHeight + sliderProgress * (maxHeight - minHeight);
    } else {
      // 映射到 5% 到 100% 的范围
      const minHeight = 5;
      const maxHeight = 100;
      targetHeight = minHeight + sliderProgress * (maxHeight - minHeight);
    }
    
    setCanvasHeight(targetHeight);
  };

  // 结束垂直拖动
  const handleVerticalMouseUp = () => {
    setIsVerticalDragging(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // 计算图片原始大小对应的画布高度
  const handleImageLoad = () => {
    if (imageRef.current && previewRef.current) {
      const img = imageRef.current;
      const container = previewRef.current;
      
      // 获取图片原始尺寸
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      
      // 获取容器尺寸
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // 计算图片在容器中的显示尺寸（保持宽高比）
      const aspectRatio = naturalWidth / naturalHeight;
      let displayWidth, displayHeight;
      
      if (containerWidth / containerHeight > aspectRatio) {
        // 容器更宽，以高度为准
        displayHeight = containerHeight;
        displayWidth = displayHeight * aspectRatio;
      } else {
        // 容器更高，以宽度为准
        displayWidth = containerWidth;
        displayHeight = displayWidth / aspectRatio;
      }
      
      // 计算图片原始大小对应的画布高度百分比
      const originalCanvasHeight = (displayHeight / containerHeight) * 100;
      setImageNaturalHeight(originalCanvasHeight);
      
      // 将画布高度设置为图片原始大小（最大显示位置）
      setCanvasHeight(originalCanvasHeight);
    }
  };

  // 处理滚轮控制画布高度
  const handleWheel = (e) => {
    const delta = e.deltaY > 0 ? 1 : -1; // 滚轮向下增加1%，向上减少1%
    setCanvasHeight(prev => {
      // 使用平滑的步长变化：高度越小，步长越小
      // 使用对数函数实现平滑过渡，最小步长为0.1，最大步长为1
      const minStep = 0.1;
      const maxStep = 1;
      const smoothFactor = Math.log(prev / 5 + 1) / Math.log(20); // 5-100映射到0-1
      const adjustedDelta = delta * (minStep + (maxStep - minStep) * smoothFactor);
      
      const newHeight = prev + adjustedDelta;
      
      // 如果知道图片原始高度，限制最大高度为原始大小
      if (imageNaturalHeight !== null) {
        return Math.max(5, Math.min(imageNaturalHeight, newHeight));
      }
      
      // 否则使用原来的逻辑
      return Math.max(5, Math.min(100, newHeight));
    });
  };

  // 添加全局事件监听器
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleVerticalMouseMove);
    document.addEventListener('mouseup', handleVerticalMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleVerticalMouseMove);
      document.removeEventListener('mouseup', handleVerticalMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, isVerticalDragging]);

  // 处理窗口大小变化，重新计算图片尺寸
  useEffect(() => {
    const handleResize = () => {
      if (imageRef.current && previewRef.current) {
        // 延迟执行，等待DOM更新
        setTimeout(handleImageLoad, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h3>
            预览对比 - {
              result.resizeMode && result.resizeMode !== 'keep' && result.resized 
                ? '调整分辨率后 vs 压缩后' 
                : '原图 vs 压缩后'
            }
          </h3>
          <div className="preview-actions">
            {result.compressed && result.compressed.compressionRatio > 0 ? (
              <button className="preview-download" onClick={() => onDownloadSingle(result)}>
                <Download style={{ width: '16px', height: '16px' }} />
              </button>
            ) : null}
            <button className="preview-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        
        <div className="preview-content" ref={previewRef} onWheel={handleWheel}>
          {/* 垂直拖动条 */}
          <div className="canvas-controls">
            <div 
              className="vertical-slider"
              onMouseDown={handleVerticalMouseDown}
            >
              <div 
                className="vertical-handle"
                style={{ 
                  top: `${((canvasHeight - 5) / ((imageNaturalHeight || 100) - 5)) * 100}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div 
            className="comparison-container" 
            ref={comparisonRef} 
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            style={{ height: `${canvasHeight}%` }}
          >
            <div className="comparison-image-container">
              <img 
                ref={imageRef}
                src={result.resizeMode && result.resizeMode !== 'keep' && result.resized ? result.resized.resizedUrl : result.originalUrl} 
                alt={result.resizeMode && result.resizeMode !== 'keep' && result.resized ? "调整分辨率后" : "压缩前"} 
                className="comparison-image comparison-original"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                draggable={false}
                onLoad={handleImageLoad}
              />
              <img 
                src={result.downloadUrl} 
                alt="压缩后" 
                className="comparison-image"
                style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                draggable={false}
              />
            </div>
            
            <div 
              className="comparison-slider"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="slider-handle"></div>
            </div>
            
            <div className="comparison-labels">
              <div className="label-left">
                {result.resizeMode && result.resizeMode !== 'keep' && result.resized ? '调整分辨率后' : '压缩前'} {
                  result.resizeMode && result.resizeMode !== 'keep' && result.resized 
                    ? formatFileSize(result.resized.size) 
                    : formatFileSize(result.original.size)
                }
              </div>
              <div className="label-right">
                压缩后 {formatFileSize(result.compressed.size)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default PreviewModal;
