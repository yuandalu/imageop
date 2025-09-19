import React, { useEffect } from 'react';

/**
 * 错误模态框组件
 * 显示详细的错误信息
 */
const ErrorModal = ({ errorModal, onClose }) => {
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
            title="复制错误信息"
          >
            复制错误信息
          </button>
          <button 
            className="btn-close" 
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
