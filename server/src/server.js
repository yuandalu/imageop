const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
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
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, '../../data/uploads'),
  compressedDir: process.env.COMPRESSED_DIR || path.join(__dirname, '../../data/compressed')
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
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../../data/uploads')));
app.use('/compressed', express.static(path.join(__dirname, '../../data/compressed')));
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// 确保目录存在
const uploadsDir = config.uploadsDir;
const compressedDir = config.compressedDir;
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(compressedDir);

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
async function compressImage(inputPath, outputPath, originalFormat, options = {}) {
  try {
    // 使用智能压缩优化器
    const result = await optimizer.compressImage(inputPath, outputPath, options);
    
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
      webpQuality: parseInt(req.body.webpQuality) || 80
    };
    
    for (const file of req.files) {
      const inputPath = file.path;
      const outputPath = path.join(compressedDir, `compressed-${file.filename}`);
      
      const result = await compressImage(inputPath, outputPath, file.mimetype, options);
      
      if (result.success) {
        results.push({
          success: true,
          original: {
            filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            size: result.originalSize,
            dimensions: result.analysis ? `${result.analysis.width}x${result.analysis.height}` : '未知尺寸',
            format: result.analysis ? result.analysis.format : 'UNKNOWN'
          },
          compressed: {
            filename: `compressed-${file.filename}`,
            size: result.compressedSize,
            compressionRatio: result.compressionRatio
          },
          downloadUrl: `/compressed/compressed-${file.filename}`,
          originalUrl: `/uploads/${file.filename}`
        });
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
