import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Eye, Settings, CheckCircle, AlertCircle, Archive } from 'lucide-react';
import axios from 'axios';
import { zipSync } from 'fflate';
import FileItem from './FileItem';
import './index.css';

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(true); // 控制显示上传界面还是文件列表
  const [previewModal, setPreviewModal] = useState(null); // 预览模态框数据
  const [errorModal, setErrorModal] = useState(null); // 错误模态框数据
  const [settings, setSettings] = useState({
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
  });
  const [compressionCache, setCompressionCache] = useState(new Map()); // 压缩结果缓存
  const [convertToJpeg, setConvertToJpeg] = useState(new Map()); // PNG转JPEG选项

  // 自动隐藏success提示
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 4000); // 4秒后自动消失
      return () => clearTimeout(timer);
    }
  }, [success]);

  // 生成文件唯一标识符
  const getFileId = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  // 获取文件格式（统一函数）
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

  // 获取文件对应的压缩参数
  // 核心作用：为缓存策略提供精确的参数比较基础
  // 根据文件格式返回该格式相关的参数，实现"按需分配"策略
  // 避免不同格式的参数变化相互干扰，确保缓存策略的精确性
  const getFileCompressionSettings = (file) => {
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

  // 检查压缩参数是否改变
  const hasCompressionSettingsChanged = (file) => {
    const fileId = getFileId(file);
    const currentSettings = getFileCompressionSettings(file);
    const cachedSettings = compressionCache.get(fileId)?.settings;
    
    if (!cachedSettings) return true; // 没有缓存，需要压缩
    
    // 比较相关参数
    return Object.keys(currentSettings).some(key => 
      cachedSettings[key] !== currentSettings[key]
    );
  };

  const onDrop = useCallback((acceptedFiles) => {
    // 重新上传：替换整个列表
    setFiles(acceptedFiles);
    setResults([]); // 清空之前的结果
    setError('');
    setSuccess('');
    setShowUpload(false); // 上传后立即切换到文件列表视图
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/bmp': ['.bmp'],
      'image/webp': ['.webp']
    },
    multiple: true,
    maxFiles: 100
  });

  const compressImages = async () => {
    if (files.length === 0) {
      setError('请先选择要压缩的图片');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('开始智能压缩，文件数量:', files.length);
      

      // 先校验所有文件是否可读
      const fileValidationPromises = files.map(async (file, index) => {
        try {
          await tryReadFileHead(file);
          return { file, index, valid: true };
        } catch (error) {
          return { file, index, valid: false };
        }
      });

      // 等待所有文件校验完成
      const fileValidationResults = await Promise.all(fileValidationPromises);

      // 分析哪些文件需要重新压缩
      const filesToCompress = [];
      const cachedResults = [];
      
      fileValidationResults.forEach(({ file, index, valid }) => {
        // 如果文件无效，创建错误结果
        if (!valid) {
          // 1. 创建错误结果
          cachedResults[index] = {
            success: false,
            filename: file.name,
            error: '文件不存在或已损坏'
          };
          
          // 2. 调用 removeFile，但保持文件列表
          removeFile(index, true); // true 表示保持文件列表
          
          return;
        }

        const fileId = getFileId(file);
        const needsCompression = hasCompressionSettingsChanged(file);
        
        if (needsCompression) {
          console.log(`文件 ${file.name} 需要重新压缩`);
          filesToCompress.push({ file, index });
        } else {
          console.log(`文件 ${file.name} 使用缓存结果`);
          const cached = compressionCache.get(fileId);
          if (cached) {
            // 为缓存结果添加缓存标记
            cachedResults[index] = {
              ...cached.result,
              _isCached: true
            };
          }
        }
      });

      let newResults = [...cachedResults];
      
      // 如果有文件需要压缩，发送请求
      if (filesToCompress.length > 0) {
        const formData = new FormData();
        filesToCompress.forEach(({ file }) => {
          formData.append('images', file);
          // 添加转换选项
          if (convertToJpeg.get(file.name)) {
            formData.append('convertToJpeg', file.name);
          }
        });
        
        // PNG 参数
        formData.append('lossy', settings.lossy);
        formData.append('pngquantMin', settings.pngquantMin);
        formData.append('pngquantMax', settings.pngquantMax);
        formData.append('pngquantSpeed', settings.pngquantSpeed);
        // JPEG 参数
        formData.append('jpegQuality', settings.jpegQuality);
        // WebP 参数
        formData.append('webpQuality', settings.webpQuality);
        // 分辨率调整参数
        formData.append('resizeMode', settings.resizeMode);
        formData.append('resizeWidth', settings.resizeWidth);
        formData.append('resizeHeight', settings.resizeHeight);
        formData.append('skipIfSmaller', settings.skipIfSmaller);
        formData.append('fit', settings.fit);

        const response = await axios.post('./api/compress/batch', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        console.log('压缩响应:', response.data);
        
        // 将新压缩结果放入正确位置并更新缓存
        response.data.results.forEach((result, resultIndex) => {
          const { index: fileIndex } = filesToCompress[resultIndex];
          newResults[fileIndex] = result;
          
          // 更新缓存
          const file = files[fileIndex];
          const fileId = getFileId(file);
          const currentSettings = getFileCompressionSettings(file);
          
          setCompressionCache(prev => {
            const newCache = new Map(prev);
            newCache.set(fileId, {
              result: result,
              settings: currentSettings
            });
            return newCache;
          });
        });
      }

      setResults(newResults);
      
      // 基于实际结果统计
      const compressedCount = newResults.filter(r => r && r.success && !r._isCached).length;
      const cachedCount = newResults.filter(r => r && r._isCached).length;
      const errorCount = newResults.filter(r => r && !r.success).length;
      
      // 更准确的成功消息
      if (errorCount > 0) {
        setSuccess(`处理完成：压缩 ${compressedCount} 张，缓存 ${cachedCount} 张，错误 ${errorCount} 张`);
      } else if (cachedCount > 0 && compressedCount > 0) {
        setSuccess(`成功压缩 ${compressedCount} 张图片（${cachedCount} 张使用缓存）`);
      } else if (cachedCount > 0) {
        setSuccess(`所有 ${cachedCount} 张图片都使用缓存结果`);
      } else {
        setSuccess(`成功压缩 ${compressedCount} 张图片`);
      }
      
    } catch (err) {
      console.error('压缩错误:', err);
      setError(err.response?.data?.error || '压缩失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const downloadAll = () => {
    results.forEach(result => {
      if (result.success && result.compressed && result.compressed.compressionRatio > 0) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.compressed.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const downloadAsZip = async () => {
    try {
      const successfulResults = results.filter(result => 
        result.success && result.compressed && result.compressed.compressionRatio > 0
      );
      
      if (successfulResults.length === 0) {
        setError('没有可下载的压缩图片');
        return;
      }

      setLoading(true);
      setSuccess('正在打包ZIP文件...');

      const filesToZip = {};
      
      for (const result of successfulResults) {
        try {
          const response = await axios.get(result.downloadUrl, { responseType: 'arraybuffer' });
          const uint8Array = new Uint8Array(response.data);
          filesToZip[result.original.filename] = uint8Array;
        } catch (error) {
          console.error(`下载文件失败: ${result.original.filename}`, error);
        }
      }

      if (Object.keys(filesToZip).length === 0) {
        setError('没有有效的压缩图片可以打包');
        setLoading(false);
        return;
      }

      try {
        const data = zipSync(filesToZip);
        const zipBlob = new Blob([data], { type: 'application/zip' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `compressed-images-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        setSuccess(`成功打包并下载 ${successfulResults.length} 张压缩图片`);
        setLoading(false);
      } catch (err) {
        setError('ZIP打包失败，请重试');
        setLoading(false);
      }
      
    } catch (error) {
      setError('ZIP打包失败，请重试');
      setLoading(false);
    }
  };

  const reUpload = () => {
    setFiles([]);
    setResults([]);
    setCompressionCache(new Map()); // 清空压缩缓存
    setError('');
    setSuccess('');
    setShowUpload(true);
  };

  const addMoreImages = () => {
    // 直接触发文件选择，不跳转到上传页面
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/bmp,image/webp';
    input.multiple = true;
    input.onchange = (e) => {
      const newFiles = Array.from(e.target.files);
      if (newFiles.length > 0) {
        // 排重：只添加不存在的文件
        setFiles(prevFiles => {
          const existingNames = new Set(prevFiles.map(file => file.name));
          const uniqueNewFiles = newFiles.filter(file => !existingNames.has(file.name));
          
          if (uniqueNewFiles.length < newFiles.length) {
            const duplicateCount = newFiles.length - uniqueNewFiles.length;
            setError(`已忽略 ${duplicateCount} 个重复文件`);
            setTimeout(() => setError(''), 3000); // 3秒后清除提示
          }
          
          return [...prevFiles, ...uniqueNewFiles];
        });
        setSuccess('');
      }
    };
    input.click();
  };


  const downloadSingle = (result) => {
    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.compressed.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 移除文件 - 优化版本
  const removeFile = useCallback((index, keepFile = false) => {
    const fileToRemove = files[index];
    if (!fileToRemove) return;
    
    // 批量更新所有状态，减少重渲染次数
    setFiles(prevFiles => keepFile ? prevFiles : prevFiles.filter((_, i) => i !== index));
    setResults(prevResults => prevResults.filter((_, i) => i !== index));
    setConvertToJpeg(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileToRemove.name);
      return newMap;
    });
    
    // 清除缓存
    const fileId = getFileId(fileToRemove);
    setCompressionCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(fileId);
      return newCache;
    });
  }, [files]);

  // 处理转换选项变化
  const handleConvertToJpeg = useCallback((filename, convert) => {
    setConvertToJpeg(prev => {
      const newMap = new Map(prev);
      if (convert) {
        newMap.set(filename, true);
      } else {
        newMap.delete(filename);
      }
      return newMap;
    });
  }, []);

  // 处理错误模态框
  const handleErrorModal = useCallback((errorData) => {
    setErrorModal(errorData);
  }, []);


  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };




  // 预览模态框组件
  function PreviewModal({ result, onClose }) {
    const [sliderPosition, setSliderPosition] = useState(50); // 滑块位置 (0-100)
    const [isDragging, setIsDragging] = useState(false);
    const [canvasHeight, setCanvasHeight] = useState(50); // 画布高度百分比 (0-100)
    const [isVerticalDragging, setIsVerticalDragging] = useState(false);
    const comparisonRef = useRef(null);
    const previewRef = useRef(null);

    const handleMouseDown = (e) => {
      setIsDragging(true);
      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !comparisonRef.current) return;
      
      const rect = comparisonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // 垂直拖动处理
    const handleVerticalMouseDown = (e) => {
      setIsVerticalDragging(true);
      e.preventDefault();
    };

    const handleVerticalMouseMove = (e) => {
      if (!isVerticalDragging || !previewRef.current) return;
      
      const rect = previewRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
      setCanvasHeight(percentage);
    };

    const handleVerticalMouseUp = () => {
      setIsVerticalDragging(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 滚轮控制画布高度（放大缩小）
    const handleWheel = (e) => {
      const delta = e.deltaY > 0 ? 1 : -1; // 滚轮向下增加1%，向上减少1%
      setCanvasHeight(prev => {
        // 使用平滑的步长变化：高度越小，步长越小
        // 使用对数函数实现平滑过渡，最小步长为0.1，最大步长为1
        const minStep = 0.1;
        const maxStep = 1;
        const smoothFactor = Math.log(prev / 5 + 1) / Math.log(20); // 5-100映射到0-1
        const adjustedDelta = delta * (minStep + (maxStep - minStep) * smoothFactor);
        
        return Math.max(5, Math.min(100, prev + adjustedDelta));
      });
    };

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
                <button className="preview-download" onClick={() => downloadSingle(result)}>
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
                  style={{ top: `${canvasHeight}%` }}
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
                  src={result.resizeMode && result.resizeMode !== 'keep' && result.resized ? result.resized.resizedUrl : result.originalUrl} 
                  alt={result.resizeMode && result.resizeMode !== 'keep' && result.resized ? "调整分辨率后" : "压缩前"} 
                  className="comparison-image comparison-original"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  draggable={false}
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
  }

  // 错误模态框组件
  function ErrorModal({ errorModal, onClose }) {
    console.log('ErrorModal渲染', errorModal);
    if (!errorModal) return null;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const copyError = async () => {
      try {
        await navigator.clipboard.writeText(errorModal.error);
        // 可以添加一个简单的提示
      } catch (err) {
        console.error('复制失败:', err);
      }
    };

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, []);

    return (
      <div className="error-modal-overlay" onClick={onClose}>
        <div className="error-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error-modal-header">
            <h3>压缩失败详情</h3>
            <button className="error-modal-close" onClick={onClose}>×</button>
          </div>
          <div className="error-modal-content">
            <div className="error-filename">{errorModal.filename}</div>
            <div className="error-message">
              <pre>{errorModal.error}</pre>
            </div>
          </div>
          <div className="error-modal-actions">
            <button 
              className="btn-copy" 
              onClick={copyError}
            >
              复制错误信息
            </button>
            <button className="btn-close" onClick={onClose}>
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>ImageOpimizer</h1>
      </header>

      {showUpload ? (
        <div className="upload-area" {...getRootProps()}>
          <input {...getInputProps()} />
          <div className="upload-content">
            <Upload className="upload-icon" />
            <div className="upload-text">
              {isDragActive ? '释放文件开始上传' : '点击或拖放上传图片'}
            </div>
            <div className="upload-subtext">
              支持PNG、JPG、JPEG、BMP、WEBP图片格式，一次可以处理100张，最大支持100M
            </div>
            <div className="upload-info">
              上传的文件30分钟后会被自动清除
            </div>
            <a href="#" className="upload-link">
              上传手机图像 →
            </a>
          </div>
        </div>
      ) : (
        <div className="file-list-container">
          <div className="file-list-header">
            <h2>文件列表</h2>
            <div className="file-list-actions">
              <button 
                className="btn-compress-header" 
                onClick={compressImages}
                disabled={loading}
              >
                {loading ? '压缩中...' : '开始压缩'}
              </button>
              <button className="btn-secondary" onClick={addMoreImages}>
                <Upload style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                添加图片
              </button>
              <button className="btn-secondary" onClick={reUpload}>
                重新上传
              </button>
              <button className="btn-primary" onClick={downloadAll}>
                <Download style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                全部下载
              </button>
              <button className="btn-zip" onClick={downloadAsZip} disabled={loading}>
                <Archive style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                打包下载
              </button>
            </div>
          </div>
          
          <div className="file-list">
            {files.map((file, index) => {
              // 优化：使用文件名作为key，避免index变化导致的重新渲染
              const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
              
              // 优化：直接通过index查找结果，避免O(n²)复杂度
              const result = results[index];
              
              return (
                <FileItem
                  key={fileKey}
                  file={file}
                  index={index}
                  result={result}
                  convertToJpeg={convertToJpeg.get(file.name) || false}
                  onRemove={removeFile}
                  onConvertToJpeg={handleConvertToJpeg}
                  onPreview={setPreviewModal}
                  onDownloadSingle={downloadSingle}
                  onErrorModal={handleErrorModal}
                />
              );
            })}
          </div>
          
          {/* 压缩设置区域 - 紧凑版 */}
          <div className="compression-settings-compact">
            <div className="settings-grid">
              {/* PNG 配置 */}
              <div className="png-config-container">
                <div className="png-config-label">PNG压缩配置</div>
                <div className="png-config-items">
                  <div className="setting-item">
                    <label className="setting-label-small">质量范围</label>
                    <div className="quality-inputs">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.pngquantMin}
                        onChange={(e) => setSettings({...settings, pngquantMin: parseInt(e.target.value)})}
                        className="setting-input-small"
                        placeholder="最小"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={settings.pngquantMax}
                        onChange={(e) => setSettings({...settings, pngquantMax: parseInt(e.target.value)})}
                        className="setting-input-small"
                        placeholder="最大"
                      />
                    </div>
                  </div>
                  
                  <div className="setting-item">
                    <label className="setting-label-small">速度</label>
                    <input
                      type="range"
                      min="1"
                      max="11"
                      value={settings.pngquantSpeed}
                      onChange={(e) => setSettings({...settings, pngquantSpeed: parseInt(e.target.value)})}
                      className="setting-range-small"
                    />
                    <span className="speed-value">{settings.pngquantSpeed}</span>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-checkbox-small">
                      <input
                        type="checkbox"
                        id="lossy"
                        checked={settings.lossy}
                        onChange={(e) => setSettings({...settings, lossy: e.target.checked})}
                        className="checkbox-small"
                      />
                      <label htmlFor="lossy">有损压缩</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* JPEG 配置 */}
              <div className="jpeg-config-container">
                <div className="jpeg-config-label">JPEG压缩配置</div>
                <div className="jpeg-config-items">
                  <div className="setting-item">
                    <label className="setting-label-small">质量</label>
                    <input
                      type="range"
                      min="60"
                      max="95"
                      value={settings.jpegQuality}
                      onChange={(e) => setSettings({...settings, jpegQuality: parseInt(e.target.value)})}
                      className="setting-range-small"
                    />
                    <span className="speed-value">{settings.jpegQuality}</span>
                  </div>
                </div>
              </div>

              {/* WebP 配置 */}
              <div className="webp-config-container">
                <div className="webp-config-label">WebP压缩配置</div>
                <div className="webp-config-items">
                  <div className="setting-item">
                    <label className="setting-label-small">质量</label>
                    <input
                      type="range"
                      min="60"
                      max="95"
                      value={settings.webpQuality}
                      onChange={(e) => setSettings({...settings, webpQuality: parseInt(e.target.value)})}
                      className="setting-range-small"
                    />
                    <span className="speed-value">{settings.webpQuality}</span>
                  </div>
                </div>
              </div>
              
              {/* 分辨率调整配置 */}
              <div className="resize-config-container">
                <div className="resize-config-label">分辨率调整配置</div>
                <div className="resize-config-items">
                  <div className="setting-item">
                    <label className="setting-label-small">调整模式</label>
                    <select
                      value={settings.resizeMode}
                      onChange={(e) => setSettings({...settings, resizeMode: e.target.value})}
                      className="setting-select-small"
                    >
                      <option value="keep">保持原尺寸</option>
                      <option value="custom">自定义尺寸</option>
                      <option value="maxWidth">按宽度缩放</option>
                      <option value="maxHeight">按高度缩放</option>
                    </select>
                  </div>
                  
                  {settings.resizeMode === 'custom' && (
                    <div className="custom-size-options">
                      <div className="setting-item">
                        <label className="setting-label-small">目标宽度</label>
                        <input
                          type="number"
                          min="1"
                          value={settings.resizeWidth}
                          onChange={(e) => setSettings({...settings, resizeWidth: parseInt(e.target.value)})}
                          className="setting-input-small"
                          placeholder="目标宽度"
                        />
                      </div>
                      <div className="setting-item">
                        <label className="setting-label-small">目标高度</label>
                        <input
                          type="number"
                          min="1"
                          value={settings.resizeHeight}
                          onChange={(e) => setSettings({...settings, resizeHeight: parseInt(e.target.value)})}
                          className="setting-input-small"
                          placeholder="目标高度"
                        />
                      </div>
                      <div className="setting-item">
                        <label className="setting-label-small">缩放规则</label>
                        <select
                          value={settings.fit}
                          onChange={(e) => setSettings({...settings, fit: e.target.value})}
                          className="setting-select-small"
                        >
                          <option value="cover">裁剪填充</option>
                          <option value="contain">完整显示</option>
                          <option value="fill">强制拉伸</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {settings.resizeMode === 'maxWidth' && (
                    <div className="proportional-size-options">
                      <div className="setting-item">
                        <label className="setting-label-small">目标宽度</label>
                        <input
                          type="number"
                          min="1"
                          value={settings.resizeWidth}
                          onChange={(e) => setSettings({...settings, resizeWidth: parseInt(e.target.value)})}
                          className="setting-input-small"
                          placeholder="目标宽度"
                        />
                      </div>
                      <div className="setting-item">
                        <div className="setting-checkbox-small">
                          <input
                            type="checkbox"
                            id="skipIfSmaller"
                            checked={settings.skipIfSmaller}
                            onChange={(e) => setSettings({...settings, skipIfSmaller: e.target.checked})}
                          />
                          <label htmlFor="skipIfSmaller">小于当前尺寸不处理</label>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {settings.resizeMode === 'maxHeight' && (
                    <div className="proportional-size-options">
                      <div className="setting-item">
                        <label className="setting-label-small">目标高度</label>
                        <input
                          type="number"
                          min="1"
                          value={settings.resizeHeight}
                          onChange={(e) => setSettings({...settings, resizeHeight: parseInt(e.target.value)})}
                          className="setting-input-small"
                          placeholder="目标高度"
                        />
                      </div>
                      <div className="setting-item">
                        <div className="setting-checkbox-small">
                          <input
                            type="checkbox"
                            id="skipIfSmaller"
                            checked={settings.skipIfSmaller}
                            onChange={(e) => setSettings({...settings, skipIfSmaller: e.target.checked})}
                          />
                          <label htmlFor="skipIfSmaller">小于当前尺寸不处理</label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 使用说明提示 */}
          <div className="usage-tips">
            <div className="tips-header">
              <span className="tips-icon">💡</span>
              <span className="tips-title">压缩优化建议</span>
            </div>
            <div className="tips-content">
              <ul>
                <li><strong>预览对比：</strong>点击小眼睛，拖拽滑动条可对比压缩前后的效果</li>
                <li><strong>PNG图片：</strong>如果损失较大，请关闭"有损压缩"选项；如果压缩不理想，转为JPG格式后进行压缩</li>
                <li><strong>其他图片：</strong>如果损失较大，请提高质量值（建议先+10，符合预期后再-5），这样可以快速确定最佳质量</li>
                <li><strong>尺寸说明：</strong>图片尺寸不宜过大，请尽量使用符合实际情况的尺寸，否则压缩效果不佳</li>
                <li><strong>重要提醒：</strong>无优化的图片可能带来极高的成本损失，请尽量达到最佳优化效果</li>
              </ul>
            </div>
          </div>  
        </div>
      )}

      {error && (
        <div className="error">
          <AlertCircle style={{ width: '20px', height: '20px', display: 'inline', marginRight: '10px' }} />
          {error}
        </div>
      )}

      {success && (
        <div className="success-toast">
          <CheckCircle style={{ width: '20px', height: '20px', display: 'inline', marginRight: '10px' }} />
          <span className="success-message">{success}</span>
          <button 
            className="success-close" 
            onClick={() => setSuccess('')}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      )}

      {previewModal && (
        <PreviewModal 
          result={previewModal} 
          onClose={() => setPreviewModal(null)} 
        />
      )}

      {errorModal && (
        <ErrorModal 
          errorModal={errorModal} 
          onClose={() => setErrorModal(null)} 
        />
      )}
    </div>
  );
}


// 检查 File 对象在内存中是否还能读取（即使本地已删，内存对象通常可用）
// 只读取前1个字节即可，无需读取全部内容
const tryReadFileHead = (file) => {
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

export default App;