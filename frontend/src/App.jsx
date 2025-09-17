import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Eye, Settings, CheckCircle, AlertCircle, Archive } from 'lucide-react';
import axios from 'axios';
import { zipSync } from 'fflate';
import './index.css';

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUpload, setShowUpload] = useState(true); // 控制显示上传界面还是文件列表
  const [isAddingMore, setIsAddingMore] = useState(false); // 是否正在添加更多图片
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
    const formatSettings = {
      png: {
        lossy: baseSettings.lossy,
        pngquantMin: baseSettings.pngquantMin,
        pngquantMax: baseSettings.pngquantMax,
        pngquantSpeed: baseSettings.pngquantSpeed,
        convertToJpeg: convertToJpeg.get(file.name) || false, // 添加转换选项
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
    if (isAddingMore) {
      // 添加更多图片：追加到现有列表
      setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    } else {
      // 重新上传：替换整个列表
      setFiles(acceptedFiles);
      setResults([]); // 清空之前的结果
    }
    setError('');
    setSuccess('');
    setShowUpload(false); // 上传后立即切换到文件列表视图
    setIsAddingMore(false); // 重置状态
  }, [isAddingMore]);

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
      
      // 分析哪些文件需要重新压缩
      const filesToCompress = [];
      const cachedResults = [];
      
      files.forEach((file, index) => {
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
      
      const compressedCount = newResults.filter(r => r && r.success).length;
      const cachedCount = filesToCompress.length === 0 ? files.length : files.length - filesToCompress.length;
      
      if (cachedCount > 0 && filesToCompress.length > 0) {
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
    setIsAddingMore(true); // 设置为添加模式
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
      setIsAddingMore(false);
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

  const previewImage = (result) => {
    window.open(result.downloadUrl, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };


  // 获取图片尺寸
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

  // 计算压缩状态和百分比
  const getCompressionStatus = (file, result) => {
    if (!result || !result.success) {
      return { status: 'waiting', percentage: 0, color: '#6b7280' };
    }

    const originalSize = file.size;
    const compressedSize = result.compressed.size;
    const percentage = Math.round(((originalSize - compressedSize) / originalSize) * 100);
    
    if (percentage > 0) {
      // 压缩成功，文件变小
      return { status: 'compressed', percentage, color: '#10b981' };
    } else if (percentage === 0) {
      // 无变化
      return { status: 'no-change', percentage: 0, color: '#ef4444' };
    } else {
      // 文件变大
      return { status: 'increased', percentage: Math.abs(percentage), color: '#ef4444' };
    }
  };

  // 文件信息组件
  function FileInfo({ file, result }) {
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
                  setErrorModal({ 
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
  }

  // 预览模态框组件
  function PreviewModal({ result, onClose }) {
    const [sliderPosition, setSliderPosition] = useState(50); // 滑块位置 (0-100)
    const [isDragging, setIsDragging] = useState(false);
    const comparisonRef = useRef(null);

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

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    useEffect(() => {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [isDragging]);

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
          
          <div className="preview-content">
            <div className="comparison-container" ref={comparisonRef} onMouseMove={handleMouseMove}>
              <div className="comparison-image-container">
                <img 
                  src={result.resizeMode && result.resizeMode !== 'keep' && result.resized ? result.resized.resizedUrl : result.originalUrl} 
                  alt={result.resizeMode && result.resizeMode !== 'keep' && result.resized ? "调整分辨率后" : "压缩前"} 
                  className="comparison-image comparison-original"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                />
                <img 
                  src={result.downloadUrl} 
                  alt="压缩后" 
                  className="comparison-image"
                  style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
                />
              </div>
              
              <div 
                className="comparison-slider"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
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
              const result = results.find(r => {
                // 成功的压缩结果有 original.filename
                if (r.original && r.original.filename === file.name) return true;
                // 失败的压缩结果直接有 filename
                if (r.filename === file.name) return true;
                return false;
              });
              
              // 处理预览点击
              const handlePreviewClick = () => {
                if (result && result.success) {
                  // 有压缩结果，显示对比界面
                  setPreviewModal(result);
                } else {
                  // 没有压缩结果，显示原图预览
                  setPreviewModal({
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
              };
              
              // 检查是否为PNG文件
              const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
              
              return (
                <div key={index} className="file-item">
                  {isPng && (
                    <div className="convert-option">
                      <label className="convert-checkbox">
                        <input
                          type="checkbox"
                          checked={convertToJpeg.get(file.name) || false}
                          onChange={(e) => {
                            const newConvertToJpeg = new Map(convertToJpeg);
                            if (e.target.checked) {
                              newConvertToJpeg.set(file.name, true);
                            } else {
                              newConvertToJpeg.delete(file.name);
                            }
                            setConvertToJpeg(newConvertToJpeg);
                          }}
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
                    <FileInfo file={file} result={result} />
                    
                    <div className="file-actions">
                      {result && result.success ? (
                        <>
                          <button className="btn-preview" onClick={() => setPreviewModal(result)}>
                            <Eye style={{ width: '12px', height: '12px' }} />
                          </button>
                          {result.compressed && result.compressed.compressionRatio > 0 ? (
                            <button className="btn-download" onClick={() => downloadSingle(result)}>
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

// 修复：创建独立的文件缩略图组件，使用 data URL
function FileThumbnail({ file }) {
  const [previewUrl, setPreviewUrl] = useState(null);

  React.useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);
    }
  }, [file]);

  return (
    <img 
      src={previewUrl || '/placeholder.png'} 
      alt={file?.name || 'preview'}
      className="file-thumbnail"
      onError={(e) => {
        e.target.src = '/placeholder.png';
      }}
    />
  );
}

export default App;