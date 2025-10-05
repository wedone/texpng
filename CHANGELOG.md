# 更新日志

本项目的所有重要变更会记录在此文件中。

说明：遵循 Keep a Changelog 规范和语义化版本（SemVer）。

## [未发布]

计划项（Roadmap）：
- 公式结果缓存（基于公式内容与渲染选项的哈希）
- 浏览器实例池与页面并发渲染（跨请求复用、限流）
- 自动清理 public/images 目录的历史图片
- 部署与运维增强（限流、日志、健康检查扩展）
- 单元测试与集成测试
- 性能监控与指标上报

## [1.1.0] - 2025-10-05

### 新增
- 支持 KaTeX mhchem（化学式 \ce{...}），并开启 trust 模式
- 新增标准定界符：`\( ... \)` 与 `\[ ... \]`，与 `$...$`、`$$...$$` 一致
- 默认字体改为 Latin Modern Math；容器中安装相应字体（Debian: texlive-fonts-extra；Alpine: texlive）并刷新 fontconfig 缓存
- 提供 Debian 与 Alpine 双版本容器镜像；Compose 增强：健康检查、共享内存（shm_size 256m）、自动重启策略
- GitHub Actions 工作流发布版本化镜像标签：`v{version}`、`{version}`、`{version}-alpine`、`latest`（仅 main）
- Web 界面更新：字体预设与提示说明、预览缩放按图片 naturalWidth 设置显示宽度（默认 50%）

### 变更
- 修复 KaTeX 可见“X”伪影：移除对子元素的过度样式继承，显式隐藏 `.fontsize-ensurer`
- 行内公式图片默认移除左右外边距，避免视觉上“多一个空格”
- 截图方式改用 `element.screenshot`，并在 `.wrap` 上设置 `line-height: 0`，减少上下额外 1–2px 的边界
- 默认渲染参数调整：`fontSize=18`、`padding=1`
- 项目更名：`texpng` → `tex2png`，同步更新镜像名、工作流、Compose 与文档

### 修复
- 行间公式后的换行处理更自然
- 文档链接与示例命令若干修正

## [1.0.0] - 2025-10-04

### 新增
- 首个可用版本：Web 界面与 REST API `/api/render`
- 公式识别：支持 `$...$`（行内）与 `$$...$$`（块级）
- 可配置渲染选项：字体、字号、颜色、背景、内边距、缩放
- 使用 KaTeX 渲染 + Puppeteer 截图，生成高清 PNG（支持透明背景）
- 实时预览的 Web 界面

### 技术特性
- 后端：Express（含 CORS、Body Parser 等）
- 解析：自动分段并识别公式
- 图片：UUID 命名，静态目录服务
- 稳定性：错误处理与输入校验，开发阶段禁用 HTML 缓存

### 文档
- README（使用说明、示例）
- TECHNICAL.md（技术细节）
- API 示例（多语言）
- MIT 许可证

# Changelog

All notable changes to this project will be documented in this file.

### Added
- Initial release of TeX to PNG Converter
- Web interface for LaTeX formula to PNG conversion
- RESTful API endpoint `/api/render`
- Support for inline (`$...$`) and block (`$$...$$`) formulas
  - Background color (with transparency support)
  - Padding (px, including 0px support)
### Technical Features
- Express.js server with CORS support
- No-cache headers for development

### Documentation
- Comprehensive README with usage examples
- Technical documentation (TECHNICAL.md)
- API documentation with multiple language examples
- MIT License

### Added

### Changed
- 预览缩放从 transform 改为设置图片实际宽度，保证占位与视觉一致
 tex2png/
- Formula caching mechanism
- Browser instance pooling for better performance
- Automatic image cleanup
- Docker deployment support
- Unit and integration tests
- Performance monitoring and metrics