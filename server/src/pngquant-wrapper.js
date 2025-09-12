const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * PNG 压缩包装器 - 直接使用 pngquant 命令行工具
 * 获得比 Sharp 更好的压缩效果
 */
class PngquantWrapper {
  constructor() {
    this.pngquantPath = this.findPngquantPath();
  }

  /**
   * 查找 pngquant 可执行文件路径
   */
  findPngquantPath() {
    // 常见的 pngquant 安装路径
    const possiblePaths = [
      'pngquant',
      '/usr/local/bin/pngquant',
      '/usr/bin/pngquant',
      '/opt/homebrew/bin/pngquant',
      'C:\\Program Files\\pngquant\\pngquant.exe',
      'C:\\Program Files (x86)\\pngquant\\pngquant.exe'
    ];

    // 首先尝试系统 PATH 中的 pngquant
    try {
      require('child_process').execSync('pngquant --version', { stdio: 'ignore' });
      return 'pngquant';
    } catch (error) {
      // 如果不在 PATH 中，尝试其他路径
      for (const pngquantPath of possiblePaths) {
        try {
          require('child_process').execSync(`"${pngquantPath}" --version`, { stdio: 'ignore' });
          return pngquantPath;
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  /**
   * 检查 pngquant 是否可用
   */
  async isAvailable() {
    if (!this.pngquantPath) {
      return false;
    }

    try {
      const { stdout } = await execAsync(`"${this.pngquantPath}" --version`);
      console.log('✅ pngquant 可用:', stdout.trim());
      return true;
    } catch (error) {
      console.log('❌ pngquant 不可用:', error.message);
      return false;
    }
  }

  /**
   * 使用 pngquant 压缩 PNG 图片
   */
  async compressPng(inputPath, outputPath, options = {}) {
    if (!this.pngquantPath) {
      throw new Error('pngquant 未安装或未找到');
    }

    const {
      quality = '60-80',        // 质量范围
      speed = 1,                // 速度 (1-11, 1最慢但质量最好)
      posterize = 0,            // 色调分离
      floyd = 0.5,              // Floyd-Steinberg 抖动
      nofs = false,             // 禁用 Floyd-Steinberg 抖动
      strip = true,             // 移除元数据
      force = true,             // 覆盖输出文件
      skipIfLarger = false,     // 如果压缩后更大则跳过
      ext = '.png',             // 输出文件扩展名
      lossy = true              // 有损压缩
    } = options;

    // 构建 pngquant 命令
    let command = `"${this.pngquantPath}"`;
    
    // 添加参数
    command += ` --quality=${quality}`;
    command += ` --speed=${speed}`;
    
    if (posterize > 0) {
      command += ` --posterize=${posterize}`;
    }
    
    if (nofs) {
      command += ' --nofs';
    }
    
    // 处理有损/无损压缩
    if (!lossy) {
      // 无损压缩：使用最高质量并禁用抖动
      command += ' --nofs';
      command = command.replace(/--quality=\d+-\d+/, '--quality=100');
    }
    
    if (strip) {
      command += ' --strip';
    }
    
    if (force) {
      command += ' --force';
    }
    
    if (skipIfLarger) {
      command += ' --skip-if-larger';
    }
    
    // 添加输出文件
    command += ` --output "${outputPath}"`;
    
    // 添加输入文件
    command += ` "${inputPath}"`;

    try {
      console.log('🔧 执行 pngquant 命令:', command);
      
      const { stdout, stderr } = await execAsync(command);
      
      // pngquant 成功时通常没有输出，或者有 "quantized" 信息
      if (stderr && !stderr.includes('quantized') && !stderr.includes('saved')) {
        console.warn('⚠️ pngquant 警告:', stderr);
      }
      
      // 检查输出文件是否存在
      if (await fs.pathExists(outputPath)) {
        const inputStats = await fs.stat(inputPath);
        const outputStats = await fs.stat(outputPath);
        
        return {
          success: true,
          originalSize: inputStats.size,
          compressedSize: outputStats.size,
          compressionRatio: ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(2),
          command: command,
          stdout: stdout,
          stderr: stderr
        };
      } else {
        // 如果输出文件不存在，可能是因为 --skip-if-larger 跳过了压缩
        // 或者压缩失败但没有错误信息
        console.log('⚠️ 输出文件不存在，可能被跳过或压缩失败');
        return {
          success: false,
          error: '输出文件未生成，可能压缩后文件更大被跳过',
          command: command,
          stdout: stdout,
          stderr: stderr
        };
      }
      
    } catch (error) {
      console.error('❌ pngquant 压缩失败:', error.message);
      console.error('stderr:', error.stderr);
      return {
        success: false,
        error: error.message,
        command: command,
        stderr: error.stderr
      };
    }
  }

  /**
   * 智能压缩 - 尝试多种策略找到最佳结果
   */
  async smartCompress(inputPath, outputPath, options = {}) {
    const strategies = [
      {
        name: '高质量',
        options: { quality: '80-95', speed: 1, ...options }
      },
      {
        name: '平衡',
        options: { quality: '60-80', speed: 3, ...options }
      },
      {
        name: '高压缩',
        options: { quality: '40-70', speed: 5, ...options }
      },
      {
        name: '极限压缩',
        options: { quality: '20-60', speed: 7, posterize: 4, ...options }
      }
    ];

    let bestResult = null;
    let bestCompressionRatio = 0;

    for (const strategy of strategies) {
      const tempOutput = `${outputPath}.temp.${strategy.name.replace(/\s+/g, '-')}`;
      
      try {
        const result = await this.compressPng(inputPath, tempOutput, strategy.options);
        
        if (result.success) {
          const compressionRatio = parseFloat(result.compressionRatio);
          
          console.log(`📊 ${strategy.name}: ${result.compressionRatio}% 压缩率`);
          
          if (compressionRatio > bestCompressionRatio) {
            bestCompressionRatio = compressionRatio;
            bestResult = {
              ...result,
              strategy: strategy.name,
              options: strategy.options
            };
            
            // 将最佳结果移动到最终输出路径
            await fs.move(tempOutput, outputPath, { overwrite: true });
          } else {
            // 删除不是最佳的结果
            await fs.remove(tempOutput);
          }
        }
      } catch (error) {
        console.error(`❌ ${strategy.name} 策略失败:`, error.message);
        await fs.remove(tempOutput).catch(() => {});
      }
    }

    if (bestResult) {
      console.log(`🏆 最佳策略: ${bestResult.strategy} (${bestResult.compressionRatio}% 压缩率)`);
    }

    return bestResult || { success: false, error: '所有压缩策略都失败了' };
  }

  /**
   * 安装 pngquant 的指导信息
   */
  getInstallInstructions() {
    return {
      macOS: 'brew install pngquant',
      ubuntu: 'sudo apt-get install pngquant',
      centos: 'sudo yum install pngquant',
      windows: '下载 pngquant-windows.zip 并解压到 PATH 目录',
      docker: '在 Dockerfile 中添加: RUN apt-get update && apt-get install -y pngquant'
    };
  }
}

module.exports = PngquantWrapper;
