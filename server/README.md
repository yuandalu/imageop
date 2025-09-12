# ImageOp 服务端 API 文档

## 📋 概述

ImageOp 服务端提供智能图片压缩服务，支持多种图片格式的优化压缩，使用先进的压缩算法确保最佳压缩效果。

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 启动生产服务器
npm start
```

## 🔧 系统要求

- **Node.js** >= 16
- **pngquant** (PNG 压缩必需)
- **Sharp** (图像处理库)

## 📡 API 接口

### 1. 健康检查

**GET** `/api/health`

检查服务状态。

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2025-09-12T06:08:58.574Z"
}
```

---

### 2. 获取压缩配置

**GET** `/api/config`

获取支持的图片格式和压缩配置信息。

**响应示例：**
```json
{
  "supportedFormats": ["jpeg", "jpg", "png", "bmp", "webp"],
  "maxFileSize": "100MB",
  "maxFiles": 100,
  "compressionConfigs": {
    "jpeg": {
      "quality": 85,
      "progressive": true,
      "mozjpeg": true
    },
    "png": {
      "quality": 80,
      "compressionLevel": 9,
      "adaptiveFiltering": true,
      "palette": true
    },
    "webp": {
      "quality": 85,
      "effort": 6
    }
  },
  "profiles": ["photo", "graphics", "screenshot", "highQuality"]
}
```

---

### 3. 批量压缩图片

**POST** `/api/compress/batch`

批量压缩多张图片，支持自定义压缩参数。

**请求参数：**
- `images`: 图片文件数组 (multipart/form-data)
- `lossy`: PNG 有损压缩开关 (true/false)
- `pngquantMin`: PNG 质量最小值 (1-100)
- `pngquantMax`: PNG 质量最大值 (1-100)
- `pngquantSpeed`: PNG 压缩速度 (1-11)
- `jpegQuality`: JPEG 质量 (1-100)
- `webpQuality`: WebP 质量 (1-100)

**请求示例：**
```bash
curl -X POST http://localhost:5000/api/compress/batch \
  -F "images=@image1.jpg" \
  -F "images=@image2.png" \
  -F "lossy=true" \
  -F "pngquantMin=60" \
  -F "pngquantMax=80" \
  -F "jpegQuality=85" \
  -F "webpQuality=85"
```

**响应示例：**
```json
{
  "results": [
    {
      "success": true,
      "original": {
        "filename": "image1.jpg",
        "size": 117195,
        "dimensions": "1920x1080",
        "format": "JPEG"
      },
      "compressed": {
        "filename": "compressed-uuid-timestamp.jpg",
        "size": 48334,
        "compressionRatio": 0.59
      },
      "downloadUrl": "/compressed/compressed-uuid-timestamp.jpg",
      "originalUrl": "/uploads/uuid-timestamp.jpg"
    }
  ]
}
```

---

### 4. 分析图片

**POST** `/api/analyze`

分析单张图片并获取压缩建议。

**请求参数：**
- `image`: 图片文件 (multipart/form-data)

**请求示例：**
```bash
curl -X POST http://localhost:5000/api/analyze \
  -F "image=@test.jpg"
```

**响应示例：**
```json
{
  "analysis": {
    "format": "JPEG",
    "dimensions": { "width": 1920, "height": 1080 },
    "size": 117195,
    "hasAlpha": false,
    "isAnimated": false,
    "profile": "photo"
  },
  "recommendedConfig": {
    "quality": 85,
    "progressive": true,
    "mozjpeg": true
  },
  "suggestions": [
    "大尺寸JPEG图片，建议降低质量到75-80"
  ]
}
```

---

### 5. 手动清理文件

**POST** `/api/cleanup`

手动触发清理30分钟前的过期文件（用于测试）。

**响应示例：**
```json
{
  "success": true,
  "deletedCount": 2,
  "deletedFiles": [
    {
      "type": "upload",
      "filename": "old-file.jpg",
      "age": 31
    },
    {
      "type": "compressed", 
      "filename": "compressed-old-file.jpg",
      "age": 31
    }
  ],
  "message": "清理完成，共删除 2 个过期文件"
}
```

---

## 📁 静态文件服务

### 上传文件访问

**GET** `/uploads/{filename}`

访问上传的原始图片文件。

### 压缩文件访问

**GET** `/compressed/{filename}`

访问压缩后的图片文件。

---

## 🔧 压缩算法

### JPEG 压缩
- **算法**: MozJPEG (基于 libjpeg-turbo)
- **特性**: 渐进式编码、优化扫描
- **参数**: 质量 (1-100)

### PNG 压缩
- **算法**: pngquant (命令行工具)
- **特性**: 调色板优化、有损/无损压缩
- **参数**: 
  - 质量范围 (min-max)
  - 压缩速度 (1-11)
  - 有损压缩开关

### WebP 压缩
- **算法**: libwebp
- **特性**: 现代格式、高质量压缩
- **参数**: 质量 (1-100)

### BMP 转换
- **处理**: 自动转换为 WebP 格式
- **优势**: 显著减小文件大小

---

## ⚙️ 配置参数

### 文件限制
- **最大文件大小**: 100MB
- **最大文件数量**: 100个
- **支持格式**: JPEG, PNG, BMP, WebP

### 自动清理
- **清理间隔**: 每5分钟检查一次
- **文件保留时间**: 30分钟
- **清理目录**: uploads/ 和 compressed/
- **保护文件**: `.gitkeep` 文件不会被清理

### 默认压缩配置
```javascript
{
  jpeg: {
    quality: 85,
    progressive: true,
    mozjpeg: true
  },
  png: {
    quality: 80,
    compressionLevel: 9,
    adaptiveFiltering: true,
    palette: true
  },
  webp: {
    quality: 85,
    effort: 6
  }
}
```

---

## 🚨 错误处理

### 常见错误码

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | 文件格式错误 | 不支持的文件格式 |
| 400 | 文件过大 | 超过100MB限制 |
| 400 | 文件过多 | 超过100个文件限制 |
| 500 | 压缩失败 | 服务器内部错误 |
| 500 | 分析失败 | 无法分析图片 |

### 错误响应格式
```json
{
  "error": "错误描述",
  "message": "详细错误信息"
}
```

---

## 📊 性能特性

### 智能压缩
- 自动分析图片特征
- 选择最优压缩算法
- 根据图片类型调整参数

### 缓存机制
- 前端缓存压缩结果
- 避免重复压缩相同文件
- 提升用户体验

### 并发处理
- 支持批量文件处理
- 异步压缩处理
- 高并发支持

---

## 🔒 安全特性

### 文件验证
- 严格的文件类型检查
- 文件大小限制
- 文件数量限制

### 自动清理
- 30分钟自动删除文件
- 保护用户隐私
- 防止磁盘空间占用
- 保护 `.gitkeep` 文件不被删除

### 错误处理
- 完善的异常捕获
- 详细的错误日志
- 安全的错误响应

---

## 📝 开发说明

### 项目结构
```
server/
├── src/
│   ├── server.js              # 主服务器文件
│   ├── compression-optimizer.js # 压缩优化器
│   └── pngquant-wrapper.js    # PNG压缩包装器
├── package.json
└── README.md
```

### 环境变量
```bash
PORT=5000                    # 服务器端口
NODE_ENV=production          # 运行环境
```

### 依赖包
- **express**: Web框架
- **multer**: 文件上传处理
- **sharp**: 图像处理
- **fs-extra**: 文件系统操作
- **uuid**: 唯一标识符生成
- **helmet**: 安全中间件
- **cors**: 跨域支持
- **compression**: 响应压缩

---

## 🎯 使用示例

### JavaScript 客户端
```javascript
// 批量压缩
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);
formData.append('lossy', 'true');
formData.append('pngquantMin', '60');
formData.append('pngquantMax', '80');

const response = await fetch('/api/compress/batch', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result.results);
```

### cURL 示例
```bash
# 压缩单张图片
curl -X POST http://localhost:5000/api/compress/batch \
  -F "images=@photo.jpg" \
  -F "jpegQuality=85"

# 分析图片
curl -X POST http://localhost:5000/api/analyze \
  -F "image=@photo.jpg"
```

---

## 📞 技术支持

如有问题或建议，请查看：
- [项目主页](../README.md)
- [快速开始指南](../docs/QUICKSTART.md)
- [部署文档](../docs/DEPLOYMENT.md)
