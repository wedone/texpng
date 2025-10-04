import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import { renderAndReplace } from './renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
// 禁用 HTML 的缓存，防止旧版页面不带 options
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'))) {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

app.post('/api/render', async (req, res) => {
  try {
    const { text, options } = req.body || {};
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text 必须是字符串' });
    }
    // 简要记录参数，便于确认是否收到设置
    const pick = (o) => o ? {
      fontFamily: o.fontFamily,
      fontSize: o.fontSize,
      color: o.color,
      background: o.background,
      padding: o.padding,
      scale: o.scale,
    } : undefined;
    console.log('[render] options:', pick(options));
    const html = await renderAndReplace(text, options || {});
    res.json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || '渲染失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
