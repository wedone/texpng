# TeX to PNG Converter

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个基于 Node.js 的 LaTeX 数学公式转 PNG 图片的 Web 工具，专为不支持 LaTeX 渲染的编辑器设计。

## 🚀 功能特点

- **智能解析**：自动识别文本中的 `$...$` 行内公式和 `$$...$$` 块级公式
- **高质量渲染**：使用 KaTeX + Puppeteer 生成高清 PNG 图片（支持透明背景）
- **样式自定义**：可配置字体、字号、颜色、背景、内边距、缩放比例
- **实时预览**：Web 界面提供即时渲染预览
- **RESTful API**：支持程序化调用
- **轻量级部署**：无需 LaTeX 发行版，开箱即用

## 📷 演示

### Web 界面
- 左侧：输入文本和公式
- 右侧：实时显示转换结果
- 下方：样式设置面板

### 输入示例
```
勾股定理：$a^2 + b^2 = c^2$

欧拉公式：
$$e^{i\pi} + 1 = 0$$

积分：
$$\int_0^1 x^2 dx = \frac{1}{3}$$
```

### 输出结果
文本保持原样，数学公式被替换为 `<img>` 标签，指向生成的 PNG 图片。

## 🛠️ 快速开始

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/yourusername/texpng.git
cd texpng

# 安装依赖
npm install

# 启动服务
npm start
# 或
node server/index.js
```

### 访问应用
- Web 界面：http://localhost:3000
- API 端点：http://localhost:3000/api/render

## 🐳 容器部署

### 构建镜像（Windows PowerShell）

```powershell
docker build -t texpng:latest .
```

### 运行容器

```powershell
# 将容器 3000 端口映射到宿主 3000，并持久化生成的图片
docker run --rm -p 3000:3000 `
  -e NODE_ENV=production `
  -v ${PWD}/public/images:/app/public/images `
  --name texpng `
  texpng:latest
```

访问：http://localhost:3000

### 使用 Docker Compose

```powershell
docker compose up --build
```

### 关于 Puppeteer 与字体
- 使用 Alpine 镜像
  - 本项目也提供 `Dockerfile.alpine`（更小体积）。构建时指定：
  
    ```powershell
    docker build -f Dockerfile.alpine -t texpng:alpine .
    docker run --rm -p 3000:3000 texpng:alpine
    ```
  
  - Alpine 已安装 `chromium`、Noto 字体与 Emoji；如需额外字体，可挂载到 `/usr/share/fonts` 并刷新字体缓存（Alpine 可安装 `fontconfig` 后执行 `fc-cache -f -v`）。

- 镜像已安装系统 Chromium 并通过环境变量配置：
  - `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
  - `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- 预装了常见字体：Noto CJK、Emoji、Liberation/DejaVu 等，以提升渲染覆盖面。
- 如需额外字体（例如特定商用字体），可在构建时 COPY 进镜像并安装，或在启动时挂载字体目录到 `/usr/share/fonts` 后执行 `fc-cache -f -v`。

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

## 📖 使用指南

### Web 界面使用

1. 打开 http://localhost:3000
2. 在左侧文本框输入包含 LaTeX 公式的文本
3. 调整下方的样式设置（可选）
4. 点击"转换"按钮或按 Ctrl+Enter
5. 右侧显示转换后的 HTML 结果

### 样式配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| fontFamily | string | KaTeX_Main, Cambria Math... | 字体族 |
| fontSize | number | 20 | 字号（px） |
| color | string | #1f2328 | 字体颜色（CSS 格式） |
| background | string | transparent | 背景颜色，transparent 为透明 |
| padding | number | 4 | 图片内边距（px） |
| scale | number | 2 | 设备像素比，影响图片清晰度 |

### LaTeX 语法支持

支持 KaTeX 的所有数学语法：

**基础语法**
- 上标：`x^2`, `x^{2+y}`
- 下标：`x_1`, `x_{i+1}`
- 分数：`\frac{a}{b}`
- 根号：`\sqrt{x}`, `\sqrt[3]{x}`

**高级语法**
- 积分：`\int_a^b f(x)dx`
- 求和：`\sum_{i=1}^n x_i`
- 极限：`\lim_{x \to \infty} f(x)`
- 矩阵：`\begin{matrix} a & b \\ c & d \end{matrix}`

## 🔌 API 文档

### POST /api/render

将包含 LaTeX 公式的文本转换为 HTML（公式替换为图片）。

**请求**
```json
{
  "text": "你的文本内容，包含 $公式$ 或 $$公式$$",
  "options": {
    "fontFamily": "Arial, sans-serif",
    "fontSize": 24,
    "color": "#000000",
    "background": "transparent",
    "padding": 8,
    "scale": 2
  }
}
```

**响应**
```json
{
  "html": "转换后的 HTML，公式已替换为 <img> 标签"
}
```

**错误响应**
```json
{
  "error": "错误信息"
}
```

### 示例调用

**cURL**
```bash
curl -X POST http://localhost:3000/api/render \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Einstein'\''s equation: $E = mc^2$",
    "options": {
      "fontSize": 24,
      "color": "#0066cc"
    }
  }'
```

**JavaScript**
```javascript
const response = await fetch('/api/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'The integral: $$\\int_0^1 x^2 dx = \\frac{1}{3}$$',
    options: {
      fontSize: 20,
      background: '#f0f0f0'
    }
  })
});
const result = await response.json();
console.log(result.html);
```

**Python**
```python
import requests

response = requests.post('http://localhost:3000/api/render', json={
    'text': 'Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$',
    'options': {
        'fontSize': 22,
        'color': '#333333'
    }
})
result = response.json()
print(result['html'])
```

## 📁 项目结构

```
texpng/
├── server/
│   ├── index.js          # Express 服务器入口
│   └── renderer.js       # 公式解析和渲染逻辑
├── public/
│   ├── index.html        # Web 界面
│   └── images/           # 生成的图片存储目录
├── package.json          # 项目依赖配置
├── README.md            # 项目文档
└── .gitignore           # Git 忽略文件
```

## ⚙️ 配置说明

### 环境变量
- `PORT`: 服务端口，默认 3000

### 自定义配置
可以修改 `server/renderer.js` 中的默认配置：
- KaTeX 渲染选项
- Puppeteer 启动参数
- 图片输出格式

## 🔧 故障排除

### 常见问题

**Q: 公式渲染失败显示错误**
A: 检查 LaTeX 语法是否正确，或查看服务器控制台错误信息

**Q: 图片显示空白**
A: 可能是字体加载问题，尝试使用系统默认字体

**Q: 服务启动失败**
A: 确保端口 3000 未被占用，或修改 PORT 环境变量

**Q: Puppeteer 安装失败**
A: 在网络受限环境下，可设置 `PUPPETEER_SKIP_DOWNLOAD=true` 并手动配置 Chrome 路径

### 性能优化

1. **启用缓存**：可以基于公式内容和样式参数实现缓存机制
2. **浏览器池**：高并发场景下可维护 Puppeteer 浏览器实例池
3. **图片清理**：定期清理 `public/images/` 目录的旧图片

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/yourusername/texpng.git
cd texpng

# 安装依赖
npm install

# 启动开发服务
npm run dev
```

### 提交规范
- feat: 新功能
- fix: 修复问题
- docs: 文档更新
- style: 代码风格调整
- refactor: 代码重构

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🙏 致谢

- [KaTeX](https://katex.org/) - 快速的数学公式渲染库
- [Puppeteer](https://pptr.dev/) - 无头浏览器控制库
- [Express](https://expressjs.com/) - Web 应用框架

## 📮 联系方式

- 作者：[你的名字]
- 邮箱：[你的邮箱]
- 项目主页：https://github.com/yourusername/texpng

---

如果这个项目对你有帮助，请给个 ⭐️ Star！
