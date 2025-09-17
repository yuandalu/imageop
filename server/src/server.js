// 先引入 path 模块
const path = require('path');

// 加载环境变量配置（从根目录的.env文件）
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const CompressionOptimizer = require('./compression-optimizer');

const app = express();
const PORT = process.env.PORT || 3080;

// 环境变量配置
const config = {
  port: PORT,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024, // 100MB
  maxFiles: parseInt(process.env.MAX_FILES) || 100,
  cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 5 * 60 * 1000, // 5分钟
  fileRetentionTime: parseInt(process.env.FILE_RETENTION_TIME) || 30 * 60 * 1000, // 30分钟
  uploadsDir: process.env.UPLOADS_DIR ? 
    (path.isAbsolute(process.env.UPLOADS_DIR) ? process.env.UPLOADS_DIR : path.resolve(__dirname, process.env.UPLOADS_DIR)) : 
    path.join(__dirname, '../../data/uploads'),
  compressedDir: process.env.COMPRESSED_DIR ? 
    (path.isAbsolute(process.env.COMPRESSED_DIR) ? process.env.COMPRESSED_DIR : path.resolve(__dirname, process.env.COMPRESSED_DIR)) : 
    path.join(__dirname, '../../data/compressed'),
  resizedDir: process.env.RESIZED_DIR ? 
    (path.isAbsolute(process.env.RESIZED_DIR) ? process.env.RESIZED_DIR : path.resolve(__dirname, process.env.RESIZED_DIR)) : 
    path.join(__dirname, '../../data/resized')
};

// 检查 pngquant 是否安装
async function checkPngquantRequirement() {
  const PngquantWrapper = require('./pngquant-wrapper');
  const pngquantWrapper = new PngquantWrapper();
  
  const isAvailable = await pngquantWrapper.isAvailable();
  if (!isAvailable) {
    console.error('❌ 错误: pngquant 未安装或未找到！');
    console.error('');
    console.error('📋 安装指南:');
    const instructions = pngquantWrapper.getInstallInstructions();
    Object.entries(instructions).forEach(([os, command]) => {
      console.error(`   ${os}: ${command}`);
    });
    console.error('');
    console.error('💡 安装完成后请重新启动服务器');
    process.exit(1);
  }
  
  console.log('✅ pngquant 检查通过，服务器可以启动');
}

// 初始化智能压缩优化器
const optimizer = new CompressionOptimizer();

// 中间件配置
// CSP配置 - 支持环境变量自定义
const cspConfig = {
  directives: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'"],
    "frame-ancestors": ["'self'"],
    "connect-src": ["'self'"],
    "object-src": ["'none'"]  // 明确禁止object标签，提高安全性
  }
};

// 从环境变量读取iframe白名单
if (process.env.CSP_FRAME_SRC) {
  console.log('CSP_FRAME_SRC', process.env.CSP_FRAME_SRC);
  const frameSources = process.env.CSP_FRAME_SRC.split(',').map(src => src.trim());
  cspConfig.directives["frame-src"] = ["'self'", ...frameSources];
}
if (process.env.CSP_FRAME_ANCESTORS) {
  const frameAncestors = process.env.CSP_FRAME_ANCESTORS.split(',').map(src => src.trim());
  cspConfig.directives["frame-ancestors"] = ["'self'", ...frameAncestors];
}

// 从环境变量读取其他CSP配置
if (process.env.CSP_SCRIPT_SRC) {
  const scriptSources = process.env.CSP_SCRIPT_SRC.split(',').map(src => src.trim());
  cspConfig.directives["script-src"] = ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...scriptSources];
}

if (process.env.CSP_CONNECT_SRC) {
  const connectSources = process.env.CSP_CONNECT_SRC.split(',').map(src => src.trim());
  cspConfig.directives["connect-src"] = ["'self'", ...connectSources];
}


app.use(helmet({
  contentSecurityPolicy: cspConfig
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(config.uploadsDir));
app.use('/compressed', express.static(config.compressedDir));
app.use('/resized', express.static(config.resizedDir));
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// 确保目录存在
const uploadsDir = config.uploadsDir;
const compressedDir = config.compressedDir;
const resizedDir = config.resizedDir;
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(compressedDir);
fs.ensureDirSync(resizedDir);

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.maxFileSize,
    files: config.maxFiles
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|bmp|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持 JPEG、PNG、BMP、WebP 格式的图片'));
    }
  }
});

// 压缩配置
const compressionConfigs = {
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
};

// 智能图片压缩函数
async function compressImage(inputPath, outputPath, originalFormat, options = {}, shouldConvertToJpeg = false) {
  try {
    // 如果需要转换为JPEG，修改选项
    const compressionOptions = { ...options };
    if (shouldConvertToJpeg && originalFormat === 'image/png') {
      compressionOptions.forceFormat = 'jpeg';
    }
    
    // 使用智能压缩优化器
    const result = await optimizer.compressImage(inputPath, outputPath, compressionOptions);
    
    if (result.success) {
      return {
        success: true,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        compressionRatio: result.compressionRatio,
        analysis: result.analysis,
        format: result.analysis.format,
        profile: result.profile,
        config: result.config
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
    
  } catch (error) {
    console.error('压缩失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// API 路由


// 批量压缩
app.post('/api/compress/batch', upload.array('images', 100), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请选择要压缩的图片' });
    }
    
    const results = [];
    const options = {
      // PNG 参数
      lossy: req.body.lossy === 'true',
      pngquantMin: parseInt(req.body.pngquantMin) || 60,
      pngquantMax: parseInt(req.body.pngquantMax) || 80,
      pngquantSpeed: parseInt(req.body.pngquantSpeed) || 3,
      // JPEG 参数
      jpegQuality: parseInt(req.body.jpegQuality) || 80,
      // WebP 参数
      webpQuality: parseInt(req.body.webpQuality) || 80,
      // 分辨率调整参数
      resizeMode: req.body.resizeMode || 'keep',
      resizeWidth: parseInt(req.body.resizeWidth) || 300,
      resizeHeight: parseInt(req.body.resizeHeight) || 200,
      skipIfSmaller: req.body.skipIfSmaller === 'true',
      fit: req.body.fit || 'cover'
    };
    
    // 获取需要转换为JPEG的文件列表
    const convertToJpegFiles = Array.isArray(req.body.convertToJpeg) 
      ? req.body.convertToJpeg 
      : req.body.convertToJpeg ? [req.body.convertToJpeg] : [];
    
    for (const file of req.files) {
      let inputPath = file.path;
      const shouldConvertToJpeg = convertToJpegFiles.includes(file.originalname);
      
      // 保存原图信息
      const originalStats = await fs.stat(inputPath);
      const originalMetadata = await require('sharp')(inputPath).metadata();
      
      // 第一步：调整分辨率（如果需要）
      let resizedPath = null;
      let resizedInfo = null;
      
      if (options.resizeMode !== 'keep') {
        resizedPath = path.join(resizedDir, `resized-${file.filename}`);
        const resizeResult = await resizeImage(inputPath, resizedPath, file.mimetype, options);
        
        if (resizeResult.success) {
          resizedInfo = {
            filename: `resized-${file.filename}`,
            size: resizeResult.resizedSize,
            dimensions: `${resizeResult.width}x${resizeResult.height}`,
            resizedUrl: `./resized/resized-${file.filename}`
          };
          // 使用调整后的图片作为压缩输入
          inputPath = resizedPath;
        } else {
          // 如果调整分辨率失败，使用原图
          console.log(`⚠️ 调整分辨率失败，使用原图: ${resizeResult.error}`);
        }
      }
      
      // 第二步：压缩
      let outputPath = path.join(compressedDir, `compressed-${file.filename}`);
      if (shouldConvertToJpeg && file.mimetype === 'image/png') {
        outputPath = outputPath.replace(/\.png$/i, '.jpg');
      }
      
      const result = await compressImage(inputPath, outputPath, file.mimetype, options, shouldConvertToJpeg);
      
      if (result.success) {
        // 根据是否转换来确定文件名和下载URL
        const compressedFilename = shouldConvertToJpeg 
          ? `compressed-${file.filename.replace(/\.png$/i, '.jpg')}`
          : `compressed-${file.filename}`;
        
        const resultData = {
          success: true,
          convertedToJpeg: shouldConvertToJpeg, // 添加转换标识
          resizeMode: options.resizeMode, // 添加分辨率调整模式
          original: {
            filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            size: originalStats.size, // 使用原图大小
            dimensions: `${originalMetadata.width}x${originalMetadata.height}`, // 使用原图尺寸
            format: result.analysis ? result.analysis.format : 'UNKNOWN'
          },
          compressed: {
            filename: compressedFilename,
            size: result.compressedSize,
            compressionRatio: result.compressionRatio
          },
          downloadUrl: `./compressed/${compressedFilename}`,
          originalUrl: `./uploads/${file.filename}`
        };
        
        // 如果有调整分辨率，添加resized信息
        if (resizedInfo) {
          resultData.resized = resizedInfo;
        }
        
        results.push(resultData);
      } else {
        results.push({
          success: false,
          filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          error: result.error
        });
      }
    }
    
    res.json({ results });
    
  } catch (error) {
    console.error('批量处理失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取压缩配置
app.get('/api/config', (req, res) => {
  res.json({
    supportedFormats: ['jpeg', 'jpg', 'png', 'bmp', 'webp'],
    maxFileSize: `${Math.round(config.maxFileSize / (1024 * 1024))}MB`,
    maxFiles: config.maxFiles,
    fileRetentionTime: `${Math.round(config.fileRetentionTime / (60 * 1000))}分钟`,
    cleanupInterval: `${Math.round(config.cleanupInterval / (60 * 1000))}分钟`,
    compressionConfigs,
    profiles: ['photo', 'graphics', 'screenshot', 'highQuality']
  });
});

// 分析图片并获取压缩建议
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要分析的图片' });
    }
    
    const analysis = await optimizer.analyzeImage(req.file.path);
    if (!analysis) {
      return res.status(500).json({ error: '无法分析图片' });
    }
    
    const config = optimizer.getOptimalConfig(analysis);
    
    res.json({
      analysis: {
        format: analysis.format,
        dimensions: { width: analysis.width, height: analysis.height },
        size: analysis.size,
        hasAlpha: analysis.hasAlpha,
        isAnimated: analysis.isAnimated,
        profile: analysis.profile
      },
      recommendedConfig: config,
      suggestions: getCompressionSuggestions(analysis)
    });
    
  } catch (error) {
    console.error('分析失败:', error);
    res.status(500).json({ error: '分析失败' });
  }
});

// 获取压缩建议
function getCompressionSuggestions(analysis) {
  const suggestions = [];
  
  if (analysis.format === 'png' && !analysis.hasAlpha && analysis.size > 1024 * 1024) {
    suggestions.push('建议转换为JPEG格式以获得更好的压缩比');
  }
  
  if (analysis.format === 'jpeg' && analysis.size > 5 * 1024 * 1024) {
    suggestions.push('大尺寸JPEG图片，建议降低质量到75-80');
  }
  
  if (analysis.width > 2048 || analysis.height > 2048) {
    suggestions.push('图片尺寸较大，建议先调整尺寸再压缩');
  }
  
  if (analysis.profile === 'graphics' && analysis.format === 'png') {
    suggestions.push('图标类图片，建议启用调色板优化');
  }
  
  return suggestions;
}

// 清理过期文件的通用函数
async function cleanupExpiredFiles(returnDetails = false) {
  try {
    const now = Date.now();
    const thirtyMinutes = config.fileRetentionTime;
    let deletedCount = 0;
    const deletedFiles = [];
    
    // 清理上传文件
    const uploadFiles = await fs.readdir(uploadsDir);
    for (const file of uploadFiles) {
      // 跳过 .gitkeep 文件
      if (file === '.gitkeep') {
        continue;
      }
      
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtime.getTime();
      if (age > thirtyMinutes) {
        console.log(`  🗑️  删除过期上传文件: ${file} (年龄: ${Math.round(age / (1000 * 60))} 分钟)`);
        await fs.remove(filePath);
        deletedCount++;
        if (returnDetails) {
          deletedFiles.push({ type: 'upload', filename: file, age: Math.round(age / (1000 * 60)) });
        }
      }
    }
    
    // 清理压缩文件
    const compressedFiles = await fs.readdir(compressedDir);
    for (const file of compressedFiles) {
      // 跳过 .gitkeep 文件
      if (file === '.gitkeep') {
        continue;
      }
      
      const filePath = path.join(compressedDir, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtime.getTime();
      if (age > thirtyMinutes) {
        console.log(`  🗑️  删除过期压缩文件: ${file} (年龄: ${Math.round(age / (1000 * 60))} 分钟)`);
        await fs.remove(filePath);
        deletedCount++;
        if (returnDetails) {
          deletedFiles.push({ type: 'compressed', filename: file, age: Math.round(age / (1000 * 60)) });
        }
      }
    }
    
    // 清理调整分辨率文件
    const resizedFiles = await fs.readdir(resizedDir);
    for (const file of resizedFiles) {
      // 跳过 .gitkeep 文件
      if (file === '.gitkeep') {
        continue;
      }
      
      const filePath = path.join(resizedDir, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtime.getTime();
      if (age > thirtyMinutes) {
        console.log(`  🗑️  删除过期调整分辨率文件: ${file} (年龄: ${Math.round(age / (1000 * 60))} 分钟)`);
        await fs.remove(filePath);
        deletedCount++;
        if (returnDetails) {
          deletedFiles.push({ type: 'resized', filename: file, age: Math.round(age / (1000 * 60)) });
        }
      }
    }
    
    if (deletedCount > 0) {
      console.log(`✅ 清理完成，共删除 ${deletedCount} 个过期文件`);
    } else {
      console.log('✅ 清理完成，没有过期文件需要删除');
    }
    
    return returnDetails ? { deletedCount, deletedFiles } : deletedCount;
  } catch (error) {
    console.error('❌ 清理文件失败:', error);
    throw error;
  }
}

// 清理临时文件（30分钟后自动删除）
setInterval(async () => {
  console.log('🧹 开始清理过期文件...');
  await cleanupExpiredFiles();
}, config.cleanupInterval); // 可配置的清理间隔

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 手动触发清理（用于测试）
app.post('/api/cleanup', async (req, res) => {
  try {
    console.log('🧹 手动触发清理过期文件...');
    const result = await cleanupExpiredFiles(true);
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      deletedFiles: result.deletedFiles,
      message: `清理完成，共删除 ${result.deletedCount} 个过期文件`
    });
    
  } catch (error) {
    console.error('❌ 手动清理失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '清理失败', 
      message: error.message 
    });
  }
});

// 调整图片分辨率函数
async function resizeImage(inputPath, outputPath, mimetype, options) {
  try {
    const sharp = require('sharp');
    
    // 获取原图信息
    const metadata = await sharp(inputPath).metadata();
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    console.log(`📐 开始调整分辨率: ${originalWidth}x${originalHeight} -> ${options.resizeMode}`);
    
    let targetWidth, targetHeight;
    
    // 根据调整模式计算目标尺寸
    switch (options.resizeMode) {
      case 'custom':
        targetWidth = options.resizeWidth;
        targetHeight = options.resizeHeight;
        break;
        
      case 'maxWidth':
        if (options.skipIfSmaller && originalWidth <= options.resizeWidth) {
          console.log(`⏭️ 原图宽度 ${originalWidth} 小于等于目标宽度 ${options.resizeWidth}，跳过调整`);
          return { success: false, error: '原图尺寸已符合要求' };
        }
        targetWidth = options.resizeWidth;
        targetHeight = Math.round((originalHeight * options.resizeWidth) / originalWidth);
        break;
        
      case 'maxHeight':
        if (options.skipIfSmaller && originalHeight <= options.resizeHeight) {
          console.log(`⏭️ 原图高度 ${originalHeight} 小于等于目标高度 ${options.resizeHeight}，跳过调整`);
          return { success: false, error: '原图尺寸已符合要求' };
        }
        targetHeight = options.resizeHeight;
        targetWidth = Math.round((originalWidth * options.resizeHeight) / originalHeight);
        break;
        
      default:
        return { success: false, error: '未知的调整模式' };
    }
    
    // 根据调整模式选择fit策略
    let fitStrategy = 'fill'; // 默认策略
    
    if (options.resizeMode === 'custom') {
      // 自定义尺寸使用用户选择的fit策略
      fitStrategy = options.fit || 'cover';
    } else if (options.resizeMode === 'maxWidth' || options.resizeMode === 'maxHeight') {
      // 按比例缩放使用contain策略，保持比例不变形
      fitStrategy = 'contain';
    }
    
    // 使用Sharp调整分辨率，保持原质量和格式
    const resizeOptions = {
      fit: fitStrategy,
      withoutEnlargement: false // 允许放大
    };
    
    // 如果是contain模式，根据目标格式选择填充方式
    if (fitStrategy === 'contain') {
      // 判断目标格式
      const isJpeg = outputPath.toLowerCase().endsWith('.jpg') || outputPath.toLowerCase().endsWith('.jpeg');
      
      if (isJpeg) {
        // JPEG格式使用白色填充（JPEG不支持透明度）
        resizeOptions.background = { r: 255, g: 255, b: 255, alpha: 1 }; // 白色背景
      } else {
        // PNG/WebP格式使用透明填充
        resizeOptions.background = { r: 0, g: 0, b: 0, alpha: 0 }; // 透明背景
      }
    }
    
    await sharp(inputPath)
      .resize(targetWidth, targetHeight, resizeOptions)
      .toFile(outputPath);
    
    // 获取调整后文件的大小
    const stats = await fs.stat(outputPath);
    const resizedSize = stats.size;
    
    console.log(`✅ 分辨率调整完成: ${originalWidth}x${originalHeight} -> ${targetWidth}x${targetHeight}`);
    
    return {
      success: true,
      width: targetWidth,
      height: targetHeight,
      resizedSize: resizedSize
    };
    
  } catch (error) {
    console.error('❌ 调整分辨率失败:', error);
    return {
      success: false,
      error: `分辨率调整失败: ${error.message}`
    };
  }
}

// 前端路由（SPA 支持）
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大100MB）' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: '文件数量超过限制（最多100个）' });
    }
  }
  
  console.error('未处理的错误:', error);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器前检查 pngquant
async function startServer() {
  try {
    await checkPngquantRequirement();
    
    app.listen(config.port, () => {
      console.log(`图片压缩服务运行在 http://localhost:${config.port}`);
      console.log(`支持格式: JPEG, PNG, BMP, WebP`);
      console.log(`最大文件大小: ${Math.round(config.maxFileSize / (1024 * 1024))}MB`);
      console.log(`最大文件数量: ${config.maxFiles}个`);
      console.log(`文件保留时间: ${Math.round(config.fileRetentionTime / (60 * 1000))}分钟`);
      console.log(`清理检查间隔: ${Math.round(config.cleanupInterval / (60 * 1000))}分钟`);
      console.log(`✅ PNG 压缩使用 pngquant 命令行工具`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error.message);
    process.exit(1);
  }
}

// 启动服务器
startServer();
