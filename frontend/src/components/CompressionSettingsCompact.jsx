import React from 'react';

// 压缩设置组件 - 紧凑版
const CompressionSettingsCompact = ({ settings, setSettings }) => {
  return (
    <div className="compression-settings-compact">
      <div className="settings-grid">
        {/* PNG 配置 */}
        <div className="png-config-container">
          <div className="png-config-label">PNG压缩配置</div>
          <div className="png-config-items">
            <div className="setting-item">
              <label className="setting-label-small">质量范围</label>
              <div className="quality-inputs">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.pngquantMin}
                  onChange={(e) => setSettings({...settings, pngquantMin: parseInt(e.target.value)})}
                  className="setting-input-small"
                  placeholder="最小"
                />
                <span>-</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.pngquantMax}
                  onChange={(e) => setSettings({...settings, pngquantMax: parseInt(e.target.value)})}
                  className="setting-input-small"
                  placeholder="最大"
                />
              </div>
            </div>
            
            <div className="setting-item">
              <label className="setting-label-small">速度</label>
              <input
                type="range"
                min="1"
                max="11"
                value={settings.pngquantSpeed}
                onChange={(e) => setSettings({...settings, pngquantSpeed: parseInt(e.target.value)})}
                className="setting-range-small"
              />
              <span className="speed-value">{settings.pngquantSpeed}</span>
            </div>
            
            <div className="setting-item">
              <div className="setting-checkbox-small">
                <input
                  type="checkbox"
                  id="lossy"
                  checked={settings.lossy}
                  onChange={(e) => setSettings({...settings, lossy: e.target.checked})}
                  className="checkbox-small"
                />
                <label htmlFor="lossy">有损压缩</label>
              </div>
            </div>
          </div>
        </div>

        {/* JPEG 配置 */}
        <div className="jpeg-config-container">
          <div className="jpeg-config-label">JPEG压缩配置</div>
          <div className="jpeg-config-items">
            <div className="setting-item">
              <label className="setting-label-small">质量</label>
              <input
                type="range"
                min="60"
                max="95"
                value={settings.jpegQuality}
                onChange={(e) => setSettings({...settings, jpegQuality: parseInt(e.target.value)})}
                className="setting-range-small"
              />
              <span className="speed-value">{settings.jpegQuality}</span>
            </div>
          </div>
        </div>

        {/* WebP 配置 */}
        <div className="webp-config-container">
          <div className="webp-config-label">WebP压缩配置</div>
          <div className="webp-config-items">
            <div className="setting-item">
              <label className="setting-label-small">质量</label>
              <input
                type="range"
                min="60"
                max="95"
                value={settings.webpQuality}
                onChange={(e) => setSettings({...settings, webpQuality: parseInt(e.target.value)})}
                className="setting-range-small"
              />
              <span className="speed-value">{settings.webpQuality}</span>
            </div>
          </div>
        </div>
        
        {/* 分辨率调整配置 */}
        <div className="resize-config-container">
          <div className="resize-config-label">分辨率调整配置</div>
          <div className="resize-config-items">
            <div className="setting-item">
              <label className="setting-label-small">调整模式</label>
              <select
                value={settings.resizeMode}
                onChange={(e) => setSettings({...settings, resizeMode: e.target.value})}
                className="setting-select-small"
              >
                <option value="keep">保持原尺寸</option>
                <option value="custom">自定义尺寸</option>
                <option value="maxWidth">按宽度缩放</option>
                <option value="maxHeight">按高度缩放</option>
              </select>
            </div>
            
            {settings.resizeMode === 'custom' && (
              <div className="custom-size-options">
                <div className="setting-item">
                  <label className="setting-label-small">目标宽度</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.resizeWidth}
                    onChange={(e) => setSettings({...settings, resizeWidth: parseInt(e.target.value)})}
                    className="setting-input-small"
                    placeholder="目标宽度"
                  />
                </div>
                <div className="setting-item">
                  <label className="setting-label-small">目标高度</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.resizeHeight}
                    onChange={(e) => setSettings({...settings, resizeHeight: parseInt(e.target.value)})}
                    className="setting-input-small"
                    placeholder="目标高度"
                  />
                </div>
                <div className="setting-item">
                  <label className="setting-label-small">缩放规则</label>
                  <select
                    value={settings.fit}
                    onChange={(e) => setSettings({...settings, fit: e.target.value})}
                    className="setting-select-small"
                  >
                    <option value="cover">裁剪填充</option>
                    <option value="contain">完整显示</option>
                    <option value="fill">强制拉伸</option>
                  </select>
                </div>
              </div>
            )}
            
            {settings.resizeMode === 'maxWidth' && (
              <div className="proportional-size-options">
                <div className="setting-item">
                  <label className="setting-label-small">目标宽度</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.resizeWidth}
                    onChange={(e) => setSettings({...settings, resizeWidth: parseInt(e.target.value)})}
                    className="setting-input-small"
                    placeholder="目标宽度"
                  />
                </div>
                <div className="setting-item">
                  <div className="setting-checkbox-small">
                    <input
                      type="checkbox"
                      id="skipIfSmaller"
                      checked={settings.skipIfSmaller}
                      onChange={(e) => setSettings({...settings, skipIfSmaller: e.target.checked})}
                    />
                    <label htmlFor="skipIfSmaller">小于当前尺寸不处理</label>
                  </div>
                </div>
              </div>
            )}
            
            {settings.resizeMode === 'maxHeight' && (
              <div className="proportional-size-options">
                <div className="setting-item">
                  <label className="setting-label-small">目标高度</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.resizeHeight}
                    onChange={(e) => setSettings({...settings, resizeHeight: parseInt(e.target.value)})}
                    className="setting-input-small"
                    placeholder="目标高度"
                  />
                </div>
                <div className="setting-item">
                  <div className="setting-checkbox-small">
                    <input
                      type="checkbox"
                      id="skipIfSmaller"
                      checked={settings.skipIfSmaller}
                      onChange={(e) => setSettings({...settings, skipIfSmaller: e.target.checked})}
                    />
                    <label htmlFor="skipIfSmaller">小于当前尺寸不处理</label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompressionSettingsCompact;
