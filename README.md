# TeX to PNG Web Tool

基于 Node.js 的小工具：
- 后端：Express + KaTeX + Puppeteer，将 `$...$` 与 `$$...$$` 公式渲染为 PNG 图片。
- 前端：简单页面，左侧输入混合文本，右侧展示替换为 `<img>` 的输出。

## 功能
- 解析输入文本中的行内与块级公式
- 使用 KaTeX 渲染并通过 Puppeteer 截图为 PNG（默认透明背景）
- 输出 HTML 片段，文本原样保留，公式替换为 `<img src="/images/<id>.png">`
- 支持可配置渲染样式：字体、字号、颜色、背景色、内边距、缩放倍数

## 快速开始
1. 安装依赖
2. 启动服务
3. 打开页面，输入文本 + TeX 公式，点击转换

详见下方“使用方法”。

## 使用方法
- 行内公式：`$a^2 + b^2 = c^2$`
- 块级公式：
```
$$
\int_0^1 x^2 \\
\sum_{i=1}^n i
$$
```

### 渲染参数（可选）
前端页面内置设置面板，可直接调整。也可通过调用 API 传入 `options` 字段：

POST /api/render
Body (application/json):
```
{
	"text": "你的文本，包含 $...$ 或 $$...$$",
	"options": {
		"fontFamily": "KaTeX_Main, Cambria Math, STIXGeneral, 'Times New Roman', serif",
		"fontSize": 20,             // px
		"color": "#000000",         // 支持 CSS 颜色
		"background": "transparent",// 也可写 #ffffff / rgb(...) 等
		"padding": 4,               // 图片内边距 px
		"scale": 2                  // 视网膜清晰度倍数（1~4）
	}
}
```

注意：background 设为 `transparent` 时导出 PNG 为透明背景；其他颜色将以该色铺底。

## 已知限制
- 渲染错误的公式将以错误提示替代
- 大量长文转换时建议分段处理

## 后续改进建议
- 缓存相同公式结果
- 缓存相同公式结果
- 字体文件与 KaTeX 静态资源本地化（保证字形一致）
- 生成可下载的打包 zip
