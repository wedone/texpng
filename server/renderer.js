import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import katex from 'katex';
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

function splitTextWithMath(input) {
  // 返回片段数组：{ type: 'text' | 'inline' | 'block', content }
  const result = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const two = input.slice(i, i + 2);
    if (two === '$$') {
      // 块级，找到下一个 $$
      const end = input.indexOf('$$', i + 2);
      if (end !== -1) {
        const content = input.slice(i + 2, end).trim();
        result.push({ type: 'block', content });
        i = end + 2;
        continue;
      }
    }
    if (input[i] === '$') {
      // 行内，找到下一个非转义 $
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
    // 文本
    let j = i + 1;
    while (j < n) {
      const ahead2 = input.slice(j, j + 2);
      if (ahead2 === '$$' || input[j] === '$') break;
      j++;
    }
    result.push({ type: 'text', content: input.slice(i, j) });
    i = j;
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
  });
  const css = await getKatexCss();

  const {
    fontFamily = 'KaTeX_Main, Cambria Math, STIXGeneral, Times New Roman, serif',
    fontSize = 20,
    color = '#000000',
    background = 'transparent'
  } = options || {};
  
  // 允许 padding 为 0，只有未设置时才用默认值 4
  const padding = options.padding !== undefined ? options.padding : 4;

  const bg = String(background).toLowerCase();
  const pad = Math.max(0, Number(padding) || 0);
  const pxSize = Math.max(1, Number(fontSize) || 1);

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
      }
      
      /* 应用用户自定义：字号和颜色 */
      .wrap .katex {
        font-size: ${pxSize}px !important;
        color: ${color} !important;
      }
      
      .wrap .katex * {
        color: inherit !important;
      }
      
      /* 对于某些特定字体，尝试覆盖 */
      ${fontFamily.toLowerCase().includes('arial') || fontFamily.toLowerCase().includes('sans-serif') ? `
      .wrap .katex .mord, 
      .wrap .katex .mop,
      .wrap .katex .mbin,
      .wrap .katex .mrel {
        font-family: Arial, sans-serif !important;
      }` : ''}
      
      ${fontFamily.toLowerCase().includes('times') || fontFamily.toLowerCase().includes('serif') ? `
      .wrap .katex .mord, 
      .wrap .katex .mop,
      .wrap .katex .mbin,
      .wrap .katex .mrel {
        font-family: "Times New Roman", serif !important;
      }` : ''}
    </style>
  </head><body>
    <div class="wrap">${html}</div>
  </body></html>`, { waitUntil: 'domcontentloaded', timeout: 5000 });

  const el = await page.$('.wrap');
  if (!el) throw new Error('渲染失败：未找到渲染容器');
  const box = await el.boundingBox();
  if (!box) throw new Error('渲染失败：无法计算尺寸');
  const id = uuidv4();
  const outPath = path.join(imageDir, `${id}.png`);
  const transparent = bg === 'transparent' || bg === 'rgba(0,0,0,0)' || bg === 'hsla(0,0%,0%,0)';
  await el.screenshot({ path: outPath, omitBackground: transparent, clip: box });
  return `/images/${id}.png`;
}

export async function renderAndReplace(text, options = {}) {
  await ensureDirs();
  const parts = splitTextWithMath(text);
  const out = [];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    const deviceScaleFactor = Number(options.scale || 2) || 2;
    await page.setViewport({ width: 800, height: 600, deviceScaleFactor });

    for (const p of parts) {
      if (p.type === 'text') {
        // 转义 HTML
        const safe = p.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
        out.push(safe);
      } else if (p.type === 'inline' || p.type === 'block') {
        const url = await renderFormulaToPng(page, p.content, p.type === 'block', options);
        const cls = p.type === 'block' ? 'formula-block' : 'formula-inline';
        out.push(`<img class=\"${cls}\" alt=\"${p.content.replace(/\"/g, '&quot;')}\" src=\"${url}\" />`);
      }
    }
    return out.join('');
  } finally {
    await browser.close();
  }
}
