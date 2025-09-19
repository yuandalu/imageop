import React, { useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

/**
 * 消息提示组件
 * 统一管理成功和错误提示的显示，内部实现自动关闭功能
 */
const MessageToast = ({ 
  success, 
  error, 
  onCloseSuccess, 
  onCloseError,
  successTimeout = 4000,  // 成功提示自动关闭时间，默认4秒
  errorTimeout = 5000     // 错误提示自动关闭时间，默认5秒
}) => {
  const successTimerRef = useRef(null);
  const errorTimerRef = useRef(null);

  // 成功提示自动关闭
  useEffect(() => {
    if (success && successTimeout > 0) {
      // 清除之前的定时器
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      
      // 设置新的定时器
      successTimerRef.current = setTimeout(() => {
        onCloseSuccess();
        successTimerRef.current = null;
      }, successTimeout);
    }

    // 清理函数
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, [success, successTimeout, onCloseSuccess]);

  // 错误提示自动关闭
  useEffect(() => {
    if (error && errorTimeout > 0) {
      // 清除之前的定时器
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      
      // 设置新的定时器
      errorTimerRef.current = setTimeout(() => {
        onCloseError();
        errorTimerRef.current = null;
      }, errorTimeout);
    }

    // 清理函数
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, [error, errorTimeout, onCloseError]);

  return (
    <>
      {/* 错误提示 */}
      {error && (
        <div className="error">
          <AlertCircle style={{ width: '20px', height: '20px', display: 'inline', marginRight: '10px' }} />
          {error}
        </div>
      )}

      {/* 成功提示 */}
      {success && (
        <div className="success-toast">
          <CheckCircle style={{ width: '20px', height: '20px', display: 'inline', marginRight: '10px' }} />
          <span className="success-message">{success}</span>
          <button 
            className="success-close" 
            onClick={onCloseSuccess}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default MessageToast;
