import React, { useState, useEffect } from 'react';

// 文件缩略图组件
const FileThumbnail = React.memo(({ file }) => {
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
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
});

export default FileThumbnail;
