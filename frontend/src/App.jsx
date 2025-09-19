import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Download, Archive } from 'lucide-react';
import axios from 'axios';
import { zipSync } from 'fflate';
import FileItem from './components/FileItem';
import PreviewModal from './components/PreviewModal';
import CompressionSettingsCompact from './components/CompressionSettingsCompact';
import MessageToast from './components/MessageToast';
import ErrorModal from './components/ErrorModal';
import { 
  getFileId, 
  validateFiles,
  analyzeCompressionNeeds,
  buildFormData,
  processCompressionResponse,
  generateSuccessMessage,
  executeCompressionRequest,
  SUPPORTED_FILE_TYPES,
  DEFAULT_COMPRESSION_SETTINGS} from './utils';
import './index.css';

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(true); // 控制显示上传界面还是文件列表
  const [previewModal, setPreviewModal] = useState(null); // 预览模态框数据
  
  // 使用消息管理 Hook
  // 消息状态管理
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errorModal, setErrorModal] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_COMPRESSION_SETTINGS);
  const [compressionCache, setCompressionCache] = useState(new Map()); // 压缩结果缓存
  const [convertToJpeg, setConvertToJpeg] = useState(new Map()); // PNG转JPEG选项




  const onDrop = useCallback((acceptedFiles) => {
    // 只有在成功接受文件时才处理
    if (acceptedFiles.length > 0) {
      // 重新上传：替换整个列表
      setFiles(acceptedFiles);
      setResults([]); // 清空之前的结果
      setError('');
      setSuccess('');
      setShowUpload(false); // 上传后立即切换到文件列表视图
    }
  }, []);

  const onDropRejected = useCallback((rejectedFiles) => {
    // 处理被拒绝的文件
    const tooManyFiles = rejectedFiles.some(file => 
      file.errors.some(error => error.code === 'too-many-files')
    );
    
    if (tooManyFiles) {
      setError('最多只能上传100个文件，请减少文件数量后重试');
    } else {
      // 检查其他类型的错误
      const invalidFileTypes = rejectedFiles.filter(file => 
        file.errors.some(error => error.code === 'file-invalid-type')
      );
      
      if (invalidFileTypes.length > 0) {
        setError(`有 ${invalidFileTypes.length} 个文件格式不支持，请只上传图片文件`);
      } else {
        setError('文件上传失败，请重试');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: SUPPORTED_FILE_TYPES,
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
      
      // 1. 验证文件
      const fileValidationResults = await validateFiles(files);
      
      // 2. 分析压缩需求
      const { filesToCompress, cachedResults } = analyzeCompressionNeeds(
        fileValidationResults, 
        settings, 
        convertToJpeg, 
        compressionCache,
        removeFile
      );
      
      let newResults = [...cachedResults];
      
      // 3. 执行压缩
      if (filesToCompress.length > 0) {
        const formData = buildFormData(filesToCompress, settings, convertToJpeg);
        const response = await executeCompressionRequest(formData);
        
        console.log('压缩响应:', response.data);
        
        const compressionResults = processCompressionResponse(
          response, 
          filesToCompress, 
          files, 
          settings, 
          convertToJpeg, 
          setCompressionCache
        );
        
        // 合并结果
        compressionResults.forEach((result, index) => {
          if (result) {
            newResults[index] = result;
          }
        });
      }
      
      setResults(newResults);
      setSuccess(generateSuccessMessage(newResults));
      
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
        // 检查当前文件数量 + 新文件数量是否超过100个
        const currentFileCount = files.length;
        const totalFileCount = currentFileCount + newFiles.length;
        
        if (totalFileCount > 100) {
          // 完全拒绝添加，显示错误提示
          setError(`最多只能添加 ${100 - currentFileCount} 个文件（当前已有 ${currentFileCount} 个文件，总共不能超过100个）`);
          return;
        }
        
        processNewFiles(newFiles);
      }
    };
    input.click();
  };

  // 处理新文件的辅助函数
  const processNewFiles = (newFiles) => {
    // 排重：只添加不存在的文件
    setFiles(prevFiles => {
      const existingNames = new Set(prevFiles.map(file => file.name));
      const uniqueNewFiles = newFiles.filter(file => !existingNames.has(file.name));
      
      if (uniqueNewFiles.length < newFiles.length) {
        const duplicateCount = newFiles.length - uniqueNewFiles.length;
        setError(`已忽略 ${duplicateCount} 个重复文件`);
      }
      
      return [...prevFiles, ...uniqueNewFiles];
    });
    setSuccess('');
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
          <CompressionSettingsCompact 
            settings={settings} 
            setSettings={setSettings} 
          />
          
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

      <MessageToast 
        success={success}
        error={error}
        onCloseSuccess={() => setSuccess('')}
        onCloseError={() => setError('')}
      />

      {previewModal && (
        <PreviewModal 
          result={previewModal} 
          onClose={() => setPreviewModal(null)}
          onDownloadSingle={downloadSingle}
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



export default App;