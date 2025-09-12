# ImageOp 快速开始指南

## 🎯 5分钟快速上手

### 第一步：安装依赖

```bash
# 安装 pngquant (必需)
# macOS
brew install pngquant

# Ubuntu/Debian
sudo apt-get install pngquant

# CentOS/RHEL
sudo yum install pngquant
```

### 第二步：启动服务

```bash
# 克隆项目后，直接运行
./start.sh
```

### 第三步：开始使用

打开浏览器访问：http://localhost:3080

## 🚀 启动方式

### 开发模式（推荐开发者）

```bash
# 前后端热更新
npm run dev

# 访问地址
# 前端: http://localhost:5173
# 后端: http://localhost:3080
```

### 生产模式（推荐用户）

```bash
# 一键启动
./start.sh

# 访问地址
# 应用: http://localhost:3080
```

### Docker 部署（推荐运维）

```bash
cd config
./deploy.sh

# 访问地址
# 应用: http://localhost:3080
```

## 📱 功能特性

### 支持的图片格式
- **JPEG/JPG**: 使用 MozJPEG 算法优化
- **PNG**: 支持有损/无损压缩，调色板优化
- **WebP**: 现代格式，高质量压缩
- **BMP**: 自动转换为 WebP

### 主要功能
- ✅ 拖拽上传，批量处理
- ✅ 实时预览对比
- ✅ 智能压缩算法
- ✅ 压缩参数可调
- ✅ 一键下载所有文件

## 🔧 基本配置

### 压缩设置

**PNG 压缩配置**
- 有损压缩：开启/关闭
- 质量范围：60-80 (推荐)
- 压缩速度：1-11 (推荐 3)

**JPEG 压缩配置**
- 质量：1-100 (推荐 80)

**WebP 压缩配置**
- 质量：1-100 (推荐 80)

### 文件限制
- 最大文件大小：100MB
- 最大文件数量：100个
- 自动清理：30分钟

## 🚨 常见问题

### 启动失败

1. **pngquant 未安装**
   ```bash
   brew install pngquant  # macOS
   sudo apt-get install pngquant  # Ubuntu
   ```

2. **端口被占用**
   ```bash
   PORT=3001 ./start.sh
   ```

3. **权限问题**
   ```bash
   chmod +x start.sh
   ```

### 压缩效果不佳

1. **PNG 压缩效果差**
   - 确保开启了有损压缩
   - 调整质量范围到 60-80
   - 检查图片是否适合有损压缩

2. **文件太大**
   - 检查是否超过 100MB 限制
   - 尝试降低质量设置

## 📖 更多信息

- [完整部署指南](DEPLOYMENT.md) - 详细的部署配置
- [项目主页](../README.md) - 项目介绍和功能说明

## 🎉 开始使用

现在您可以：
1. 打开浏览器访问 http://localhost:3080
2. 拖拽或点击上传图片
3. 调整压缩设置
4. 开始压缩并下载结果

享受高效的图片压缩体验！ 🚀