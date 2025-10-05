import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import katex from 'katex';
// 启用 KaTeX 的 mhchem 插件以支持 \ce{...}
import 'katex/contrib/mhchem';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');
const imageDir = path.join(publicDir, 'images');
const katexCssFile = path.join(__dirname, '../node_modules/katex/dist/katex.min.css');

let cachedKatexCss = null;
async function getKatexCss() {
  if (cachedKatexCss) return cachedKatexCss;
  try {
    cachedKatexCss = await fs.readFile(katexCssFile, 'utf-8');
  } catch (e) {
    // 兜底，极端情况下无 CSS 也能输出（但样式可能不美观）
    cachedKatexCss = '';
  }
  return cachedKatexCss;
}

async function ensureDirs() {
  await fs.mkdir(imageDir, { recursive: true });
}

function normalizeFontFamily(input) {
  if (!input) return '"Latin Modern Math", KaTeX_Main, KaTeX_Math, "STIX Two Math", STIXGeneral, "Cambria Math", serif';
  // 拆分逗号分隔的字体族，修剪空白，为包含空格或特殊字符的字体名补充引号
  const parts = String(input)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(name => {
      const lower = name.toLowerCase();
      // 通用族名不加引号
      if (['serif','sans-serif','monospace','cursive','fantasy','system-ui'].includes(lower)) return lower;
      // 已加引号的保持
      if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) return name;
      // 含空格或连字符等，补双引号
      if (/[^a-z0-9_-]/i.test(name)) return `"${name}"`;
      return name;
    });
  return parts.join(', ');
}

function splitTextWithMath(input) {
  // 先规范化：将可能的双反斜杠定界符转为单反斜杠，避免多层转义导致无法匹配
  const normalized = String(input)
    .replace(/\\\(/g, '\\(')
    .replace(/\\\)/g, '\\)')
    .replace(/\\\[/g, '\\[')
    .replace(/\\\]/g, '\\]');

  // 全面支持 $...$、$$...$$、\(...\)、\[...\]，不受转义影响
  const result = [];
  // 顺序：$$...$$、\[...\]、$...$、\(...\)
  const regex = /(\$\$([\s\S]+?)\$\$)|(\\\[([\s\S]+?)\\\])|(\$([\s\S]+?)\$)|(\\\(([\s\S]+?)\\\))/g;
  // 说明：
  //  - $$...$$    -> 分组1/2
  //  - \[...\]   -> 分组3/4（单反斜杠）
  //  - $...$      -> 分组5/6
  //  - \(...\)   -> 分组7/8（单反斜杠）
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', content: normalized.slice(lastIndex, match.index) });
    }
    if (match[1]) { // $$...$$
      result.push({ type: 'block', content: match[2] });
    } else if (match[3]) { // \[...\]
      result.push({ type: 'block', content: match[4] });
    } else if (match[5]) { // $...$
      result.push({ type: 'inline', content: match[6] });
    } else if (match[7]) { // \(...\)
      result.push({ type: 'inline', content: match[8] });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < normalized.length) {
    result.push({ type: 'text', content: normalized.slice(lastIndex) });
  }
  return result;
}

async function renderFormulaToPng(page, latex, displayMode = false, options = {}) {
  // 使用 KaTeX 渲染，保持其数学字体的专业性
  const html = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    output: 'htmlAndMathml',
    strict: 'ignore',
    trust: true,
  });
  const css = await getKatexCss();

  const {
    fontFamily = '"Latin Modern Math", KaTeX_Main, KaTeX_Math, "STIX Two Math", STIXGeneral, "Cambria Math", serif',
    fontSize = 18,
    color = '#000000',
    background = 'transparent'
  } = options || {};
  
  // 允许 padding 为 0，只有未设置时才用默认值 1
  const padding = options.padding !== undefined ? options.padding : 1;

  const bg = String(background).toLowerCase();
  const pad = Math.max(0, Number(padding) || 0);
  const pxSize = Math.max(1, Number(fontSize) || 1);

  const normalizedFontFamily = normalizeFontFamily(fontFamily);

  await page.setContent(`<!doctype html><html><head>
    <meta charset="utf-8" />
    <style>
      /* KaTeX 基础样式 */
      ${css}
      
      body { 
        margin: 0; 
        background: ${bg}; 
      }
      
      .wrap { 
        display: inline-block; 
        padding: ${pad}px;
        /* 避免行高造成的额外上下空隙 */
        line-height: 0;
      }
      
      /* 减少 KaTeX 的默认间距 */
      .wrap .katex-display {
        margin: 0 !important;
      }
      
      .wrap .katex {
        margin: 0 !important;
      }
      
      /* 应用用户自定义：字号、颜色；
         注意：不要强制覆盖子元素的 color/font-family，
         以免破坏 KaTeX 内部使用的透明度量字符，导致可见的“X”出现。 */
      .wrap .katex {
        font-size: ${pxSize}px;
        color: ${color};
        /* 允许用户自定义字体，但不使用 !important，避免覆盖 KaTeX 的专用字体 */
        font-family: ${normalizedFontFamily};
      }

      /* 显式隐藏 KaTeX 用于字号度量的占位元素，防止出现可见的 "X" */
      .wrap .katex .fontsize-ensurer { visibility: hidden; }
      
      /* 对于某些特定字体，尝试覆盖 */
      /* 不强制覆盖 serif/sans-serif 的具体实现，尊重用户传入的 font-family 链 */
    </style>
  </head><body>
    <div class="wrap">${html}</div>
  </body></html>`, { waitUntil: 'domcontentloaded', timeout: 5000 });

  const el = await page.$('.wrap');
  if (!el) throw new Error('渲染失败：未找到渲染容器');
  const id = uuidv4();
  const outPath = path.join(imageDir, `${id}.png`);
  const transparent = bg === 'transparent' || bg === 'rgba(0,0,0,0)' || bg === 'hsla(0,0%,0%,0)';
  // 直接对元素截图，避免手动 clip 时像素取整带来的额外 1-2px 空隙
  await el.screenshot({ path: outPath, omitBackground: transparent });
  return `/images/${id}.png`;
}

export async function renderAndReplace(text, options = {}) {
  await ensureDirs();
  // 规范化输入：将可能出现的双反斜杠定界符规整为单反斜杠，便于识别
  // 例如 "\\(" -> "\(", "\\]" -> "\]"
  const normalizedText = String(text)
    .replace(/\\\(/g, '\\(')
    .replace(/\\\)/g, '\\)')
    .replace(/\\\[/g, '\\[')
    .replace(/\\\]/g, '\\]');

  const parts = splitTextWithMath(normalizedText);
  const out = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    const deviceScaleFactor = Number(options.scale || 2) || 2;
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor });

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const nextPart = parts[i + 1];
      
      if (p.type === 'text') {
        // 转义 HTML，但对于行间公式后的换行符进行特殊处理
        let content = p.content;
        
        // 如果前一个是行间公式，且当前文本以换行开始，则去掉开头的换行
        if (i > 0 && parts[i - 1].type === 'block' && content.startsWith('\n')) {
          content = content.slice(1);
        }
        
        const safe = content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
        out.push(safe);
      } else if (p.type === 'inline' || p.type === 'block') {
        const url = await renderFormulaToPng(page, p.content, p.type === 'block', options);
        const cls = p.type === 'block' ? 'formula-block' : 'formula-inline';
        const alt = p.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        out.push(`<img class="${cls}" alt="${alt}" src="${url}" />`);
      }
    }
    return out.join('');
  } finally {
    await browser.close();
  }
}
