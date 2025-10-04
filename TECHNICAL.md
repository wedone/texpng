# TeX to PNG 技术文档

## 架构概览

本项目采用前后端分离的 Web 架构，后端提供 RESTful API，前端提供可视化界面。

### 技术栈

**后端**
- **Node.js**: JavaScript 运行时
- **Express**: Web 应用框架
- **KaTeX**: LaTeX 数学公式渲染库
- **Puppeteer**: 无头 Chrome 浏览器控制
- **UUID**: 生成唯一图片标识符

**前端**
- **原生 HTML/CSS/JavaScript**: 轻量级实现
- **Fetch API**: HTTP 请求处理
- **CSS Grid**: 响应式布局

## 核心组件

### 1. 服务器入口 (`server/index.js`)

**职责**
- 启动 Express 服务器
- 配置中间件（CORS、Body Parser、静态文件）
- 定义 API 路由
- 错误处理

**关键代码**
```javascript
app.post('/api/render', async (req, res) => {
  try {
    const { text, options } = req.body || {};
    const html = await renderAndReplace(text, options || {});
    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### 2. 渲染引擎 (`server/renderer.js`)

**职责**
- 解析文本中的 LaTeX 公式
- 使用 KaTeX 进行数学渲染
- 通过 Puppeteer 截图生成 PNG
- 替换原文本中的公式为图片链接

**核心流程**
1. `splitTextWithMath()`: 文本分段解析
2. `renderFormulaToPng()`: 公式渲染为图片
3. `renderAndReplace()`: 统筹整个转换流程

### 3. 前端界面 (`public/index.html`)

**职责**
- 提供用户交互界面
- 样式参数配置
- 发送渲染请求
- 展示转换结果

## 详细实现

### 公式解析算法

```javascript
function splitTextWithMath(input) {
  const result = [];
  let i = 0;
  const n = input.length;
  
  while (i < n) {
    // 检测 $$...$$ 块级公式
    if (input.slice(i, i + 2) === '$$') {
      const end = input.indexOf('$$', i + 2);
      if (end !== -1) {
        const content = input.slice(i + 2, end).trim();
        result.push({ type: 'block', content });
        i = end + 2;
        continue;
      }
    }
    
    // 检测 $...$ 行内公式
    if (input[i] === '$') {
      let j = i + 1;
      while (j < n) {
        if (input[j] === '$' && input[j - 1] !== '\\') break;
        j++;
      }
      if (j < n) {
        const content = input.slice(i + 1, j).trim();
        result.push({ type: 'inline', content });
        i = j + 1;
        continue;
      }
    }
    
    // 普通文本
    // ...
  }
  
  return result;
}
```

### 图片生成流程

1. **KaTeX 渲染**: 将 LaTeX 转换为 HTML + CSS
2. **页面构建**: 创建包含样式的完整 HTML 页面
3. **浏览器渲染**: Puppeteer 在无头 Chrome 中渲染页面
4. **截图导出**: 截取公式区域并保存为 PNG

```javascript
async function renderFormulaToPng(page, latex, displayMode, options) {
  const html = katex.renderToString(latex, { displayMode });
  
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <style>
          ${katexCss}
          .wrap { 
            padding: ${options.padding}px;
            color: ${options.color} !important;
            font-size: ${options.fontSize}px !important;
            font-family: ${options.fontFamily} !important;
          }
        </style>
      </head>
      <body style="background: ${options.background}">
        <div class="wrap">${html}</div>
      </body>
    </html>
  `);
  
  const element = await page.$('.wrap');
  const box = await element.boundingBox();
  const imagePath = path.join(imageDir, `${uuid()}.png`);
  
  await element.screenshot({
    path: imagePath,
    omitBackground: options.background === 'transparent',
    clip: box
  });
  
  return `/images/${uuid}.png`;
}
```

## 配置与自定义

### 样式参数处理

支持的配置选项及其处理逻辑：

| 参数 | 验证 | 默认值 | 处理方式 |
|------|------|--------|----------|
| fontFamily | string | KaTeX_Main, ... | 直接应用到 CSS |
| fontSize | number | 20 | `Math.max(1, Number(value))` |
| color | string | #1f2328 | CSS 颜色格式 |
| background | string | transparent | 影响 `omitBackground` |
| padding | number | 4 | `Math.max(0, Number(value))` |
| scale | number | 2 | Puppeteer `deviceScaleFactor` |

### 错误处理策略

1. **输入验证**: 确保 text 为字符串类型
2. **LaTeX 解析**: KaTeX `throwOnError: false` 避免崩溃
3. **浏览器异常**: try-catch 包装 Puppeteer 操作
4. **资源清理**: finally 块确保浏览器关闭

## 性能优化

### 当前实现

- **单次渲染**: 每个请求创建新的浏览器实例
- **内存管理**: 及时关闭浏览器释放资源
- **CSS 缓存**: KaTeX CSS 读取一次后缓存

### 优化建议

1. **浏览器池**
```javascript
class BrowserPool {
  constructor(size = 3) {
    this.pool = [];
    this.size = size;
  }
  
  async getBrowser() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return await puppeteer.launch();
  }
  
  releaseBrowser(browser) {
    if (this.pool.length < this.size) {
      this.pool.push(browser);
    } else {
      browser.close();
    }
  }
}
```

2. **公式缓存**
```javascript
const formulaCache = new Map();

function getCacheKey(latex, options) {
  return crypto.createHash('md5')
    .update(JSON.stringify({ latex, options }))
    .digest('hex');
}

async function renderWithCache(latex, options) {
  const key = getCacheKey(latex, options);
  if (formulaCache.has(key)) {
    return formulaCache.get(key);
  }
  
  const result = await renderFormulaToPng(latex, options);
  formulaCache.set(key, result);
  return result;
}
```

3. **图片清理**
```javascript
const cleanupOldImages = () => {
  const imageDir = path.join(__dirname, '../public/images');
  const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24小时
  
  fs.readdir(imageDir, (err, files) => {
    files.forEach(file => {
      const filePath = path.join(imageDir, file);
      fs.stat(filePath, (err, stats) => {
        if (stats.mtime.getTime() < cutoff) {
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
};

// 每小时执行一次清理
setInterval(cleanupOldImages, 60 * 60 * 1000);
```

## 安全考虑

### 输入验证

1. **文本长度限制**: 防止超大文本导致内存溢出
2. **公式复杂度**: 限制嵌套层数和渲染时间
3. **请求频率**: 实现速率限制防止滥用

### 文件安全

1. **路径遍历**: 图片文件名使用 UUID 避免路径注入
2. **文件类型**: 仅生成 PNG 格式图片
3. **存储限制**: 定期清理避免磁盘占满

### 示例安全增强

```javascript
// 请求大小限制
app.use(bodyParser.json({ limit: '1mb' }));

// 速率限制
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP最多100次请求
});
app.use('/api/', limiter);

// 文本长度验证
if (text.length > 10000) {
  return res.status(400).json({ error: '文本长度超出限制' });
}
```

## 部署指南

### 生产环境配置

1. **环境变量**
```bash
export NODE_ENV=production
export PORT=8080
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

2. **Docker 部署**
```dockerfile
FROM node:18-alpine

# 安装 Chromium
RUN apk add --no-cache chromium

# 设置 Puppeteer 使用系统 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000

CMD ["node", "server/index.js"]
```

3. **反向代理 (Nginx)**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /images/ {
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
}
```

## 测试策略

### 单元测试

```javascript
// renderer.test.js
const { splitTextWithMath } = require('../server/renderer');

describe('splitTextWithMath', () => {
  test('should parse inline formulas', () => {
    const input = 'Text with $x^2$ formula';
    const result = splitTextWithMath(input);
    expect(result).toEqual([
      { type: 'text', content: 'Text with ' },
      { type: 'inline', content: 'x^2' },
      { type: 'text', content: ' formula' }
    ]);
  });
  
  test('should parse block formulas', () => {
    const input = 'Block:\n$$\\int_0^1 x dx$$';
    const result = splitTextWithMath(input);
    expect(result[1]).toEqual({
      type: 'block',
      content: '\\int_0^1 x dx'
    });
  });
});
```

### 集成测试

```javascript
// api.test.js
const request = require('supertest');
const app = require('../server/index');

describe('POST /api/render', () => {
  test('should render formulas to images', async () => {
    const response = await request(app)
      .post('/api/render')
      .send({
        text: 'Formula: $x^2$',
        options: { fontSize: 20 }
      });
      
    expect(response.status).toBe(200);
    expect(response.body.html).toContain('<img');
    expect(response.body.html).toContain('/images/');
  });
});
```

## 监控与日志

### 性能监控

```javascript
// 渲染时间统计
const renderingMetrics = {
  totalRequests: 0,
  totalRenderTime: 0,
  errors: 0
};

app.post('/api/render', async (req, res) => {
  const startTime = Date.now();
  renderingMetrics.totalRequests++;
  
  try {
    const html = await renderAndReplace(text, options);
    const renderTime = Date.now() - startTime;
    renderingMetrics.totalRenderTime += renderTime;
    
    console.log(`[METRICS] Render time: ${renderTime}ms`);
    res.json({ html });
  } catch (err) {
    renderingMetrics.errors++;
    console.error(`[ERROR] Render failed:`, err);
    res.status(500).json({ error: err.message });
  }
});

// 定期输出统计信息
setInterval(() => {
  const avgRenderTime = renderingMetrics.totalRenderTime / renderingMetrics.totalRequests;
  console.log(`[STATS] Requests: ${renderingMetrics.totalRequests}, Avg render time: ${avgRenderTime.toFixed(2)}ms, Errors: ${renderingMetrics.errors}`);
}, 60000);
```

### 健康检查

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

这份技术文档涵盖了项目的核心架构、实现细节、优化建议和部署指南，为开发者提供了全面的技术参考。