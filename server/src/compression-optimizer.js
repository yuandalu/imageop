const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const PngquantWrapper = require('./pngquant-wrapper');

/**
 * 高级图片压缩优化器
 * 根据不同图片类型和特征选择最优压缩策略
 */
class CompressionOptimizer {
  constructor() {
    this.pngquantWrapper = new PngquantWrapper();
    this.compressionProfiles = {
      // 照片类图片 (JPEG 优化)
      photo: {
        jpeg: {
          quality: 85,
          progressive: true,
          mozjpeg: true,
          optimizeScans: true
        },
        webp: {
          quality: 85,
          effort: 6,
          smartSubsample: true
        }
      },
      
      // 图标/图形类 (PNG 优化)
      graphics: {
        png: {
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
          quality: 80
        },
        webp: {
          quality: 90,
          effort: 6,
          lossless: false
        }
      },
      
      // 截图类 (平衡压缩)
      screenshot: {
        png: {
          compressionLevel: 8,
          adaptiveFiltering: true,
          palette: false,
          quality: 75
        },
        jpeg: {
          quality: 80,
          progressive: true,
          mozjpeg: true
        }
      },
      
      // 高质量要求
      highQuality: {
        jpeg: {
          quality: 95,
          progressive: true,
          mozjpeg: true
        },
        png: {
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: false
        },
        webp: {
          quality: 95,
          effort: 6
        }
      }
    };
  }

  /**
   * 分析图片特征，选择最优压缩策略
   */
  async analyzeImage(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await fs.stat(imagePath);
      
      const analysis = {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: stats.size,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha,
        density: metadata.density,
        isAnimated: metadata.pages > 1,
        colorSpace: metadata.space,
        profile: this.detectImageProfile(metadata, stats.size)
      };
      
      return analysis;
    } catch (error) {
      console.error('图片分析失败:', error);
      return null;
    }
  }

  /**
   * 检测图片类型和特征
   */
  detectImageProfile(metadata, fileSize) {
    const { format, width, height, channels, hasAlpha } = metadata;
    const aspectRatio = width / height;
    const pixelCount = width * height;
    const bytesPerPixel = fileSize / pixelCount;
    
    // 判断图片类型
    if (format === 'jpeg') {
      // JPEG 通常是照片
      if (aspectRatio > 0.8 && aspectRatio < 1.2 && pixelCount > 1000000) {
        return 'photo'; // 正方形大图，可能是照片
      }
      return 'photo';
    }
    
    if (format === 'png') {
      // PNG 分析
      if (hasAlpha) {
        return 'graphics'; // 有透明通道，可能是图标
      }
      
      if (bytesPerPixel > 3 && pixelCount < 500000) {
        return 'graphics'; // 高字节密度小图，可能是图标
      }
      
      if (width > 1920 || height > 1080) {
        return 'screenshot'; // 大尺寸，可能是截图
      }
      
      return 'graphics';
    }
    
    if (format === 'webp') {
      return 'highQuality'; // WebP 保持高质量
    }
    
    return 'photo'; // 默认
  }

  /**
   * 获取最优压缩配置
   */
  getOptimalConfig(analysis, userOptions = {}) {
    const profile = analysis.profile;
    const format = analysis.format;
    
    let config = this.compressionProfiles[profile][format] || 
                 this.compressionProfiles.photo[format] ||
                 this.compressionProfiles.photo.jpeg;
    
    // 应用用户自定义选项
    if (userOptions.quality) {
      config.quality = userOptions.quality;
    }
    
    // 应用格式特定的质量设置
    if (format === 'jpeg' && userOptions.jpegQuality) {
      config.quality = userOptions.jpegQuality;
    }
    
    if (format === 'webp' && userOptions.webpQuality) {
      config.quality = userOptions.webpQuality;
    }
    
    if (userOptions.lossy !== undefined && format === 'png') {
      config.palette = userOptions.lossy;
    }
    
    // 根据文件大小调整策略
    if (analysis.size > 10 * 1024 * 1024) { // 大于10MB
      config.quality = Math.max(config.quality - 10, 60);
    }
    
    return {
      ...config,
      format: format,
      profile: profile
    };
  }

  /**
   * 执行智能压缩
   */
  async compressImage(inputPath, outputPath, userOptions = {}) {
    try {
      // 分析图片
      const analysis = await this.analyzeImage(inputPath);
      if (!analysis) {
        throw new Error('无法分析图片');
      }
      
      // 获取最优配置
      const config = this.getOptimalConfig(analysis, userOptions);
      
      // 创建压缩管道
      let pipeline = sharp(inputPath);
      
      // 根据格式应用配置
      switch (config.format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: config.quality,
            progressive: config.progressive,
            mozjpeg: config.mozjpeg,
            optimizeScans: config.optimizeScans
          });
          break;
          
        case 'png':
          // PNG 必须使用 pngquant 命令行工具
          console.log('🚀 使用 pngquant 命令行工具进行 PNG 压缩');
          
          // 使用 pngquant 命令行工具 - 使用前端传递的参数
          const qualityRange = `${userOptions.pngquantMin || 60}-${userOptions.pngquantMax || 80}`;
          
          const pngquantResult = await this.pngquantWrapper.compressPng(inputPath, outputPath, {
            quality: qualityRange,
            speed: userOptions.pngquantSpeed || 3,
            strip: true,
            force: true,
            skipIfLarger: false,  // 强制输出，不跳过
            lossy: userOptions.lossy !== false  // 传递lossy参数，默认为true
          });
          
          if (pngquantResult.success) {
            return {
              success: true,
              originalSize: pngquantResult.originalSize,
              compressedSize: pngquantResult.compressedSize,
              compressionRatio: pngquantResult.compressionRatio,
              profile: config.profile,
              config: { ...config, method: 'pngquant-cli' },
              analysis: analysis
            };
          } else {
            throw new Error(`pngquant 压缩失败: ${pngquantResult.error}`);
          }
          break;
          
        case 'webp':
          pipeline = pipeline.webp({
            quality: config.quality,
            effort: config.effort,
            smartSubsample: config.smartSubsample,
            lossless: config.lossless
          });
          break;
          
        default:
          // 转换为WebP
          pipeline = pipeline.webp({
            quality: 85,
            effort: 6
          });
      }
      
      // 执行压缩
      await pipeline.toFile(outputPath);
      
      // 获取压缩结果
      const originalStats = await fs.stat(inputPath);
      const compressedStats = await fs.stat(outputPath);
      
      return {
        success: true,
        originalSize: originalStats.size,
        compressedSize: compressedStats.size,
        compressionRatio: ((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(2),
        profile: config.profile,
        config: config,
        analysis: analysis
      };
      
    } catch (error) {
      console.error('智能压缩失败:', error);
      
      // 清理错误信息中的路径，保留其他信息
      let cleanError = error.message;
      // 替换文件路径为占位符
      cleanError = cleanError.replace(/\/[^\s"]+\.(png|jpg|jpeg|webp|bmp)/gi, '[文件路径]');
      cleanError = cleanError.replace(/\/[^\s"]+/g, '[路径]');
      // 替换引号中的路径
      cleanError = cleanError.replace(/"[^"]*\/[^"]*"/g, '"[路径]"');
      
      return {
        success: false,
        error: cleanError
      };
    }
  }

  /**
   * 批量智能压缩
   */
  async compressBatch(inputPaths, outputDir, userOptions = {}) {
    const results = [];
    
    for (const inputPath of inputPaths) {
      const filename = path.basename(inputPath);
      const outputPath = path.join(outputDir, `optimized-${filename}`);
      
      const result = await this.compressImage(inputPath, outputPath, userOptions);
      results.push({
        inputPath,
        outputPath,
        ...result
      });
    }
    
    return results;
  }
}

module.exports = CompressionOptimizer;
