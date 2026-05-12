#!/usr/bin/env node
'use strict';


// ─────────────────────────── 布局常量 ────────────────────────────────
const JINA_PREFIX = 'https://r.jina.ai/';
const COL  = Math.min(process.stdout.columns || 80, 96);
const PAD  = 3;
const TW   = COL - PAD;       // 正文可用宽度
const SP   = ' '.repeat(PAD); // 左边距

// ──────────────────────────── ANSI 颜色 ──────────────────────────────
const B   = '\x1b[1m';   // bold
const D   = '\x1b[2m';   // dim
const IT  = '\x1b[3m';   // italic
const UN  = '\x1b[4m';   // underline
const BL  = '\x1b[94m';  // bright blue（accent）
const R   = '\x1b[0m';   // reset
const REV = '\x1b[7m';   // reverse（inline code 背景）

// ─────────────────────────── 工具函数 ────────────────────────────────
// 计算去除 ANSI 后的可视长度
function vlen(s) { return s.replace(/\x1b\[[0-9;]*m/g, '').length; }

// 自动换行，保留左边距
function wrap(text, width, first = SP, rest = SP) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '', indent = first;
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (vlen(indent) + vlen(next) > width) {
      if (cur) lines.push(indent + cur);
      cur = w; indent = rest;
    } else { cur = next; }
  }
  if (cur) lines.push(indent + cur);
  return lines.join('\n');
}

// 缩短 URL 用于展示
function shortenUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 28 ? u.pathname.slice(0, 25) + '…' : u.pathname;
    return u.hostname + path;
  } catch { return url.length > 40 ? url.slice(0, 37) + '…' : url; }
}

// ────────────────────────── 内联元素渲染 ──────────────────────────────
function inline(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/gs, `${B}${IT}$1${R}`)
    .replace(/\*\*(.+?)\*\*/gs,     `${B}$1${R}`)
    .replace(/\*(.+?)\*/gs,         `${IT}$1${R}`)
    .replace(/__(.+?)__/gs,         `${B}$1${R}`)
    .replace(/_(.+?)_/gs,           `${IT}$1${R}`)
    .replace(/`([^`\n]+)`/g,        `${REV} $1 ${R}`)
    .replace(/~~(.+?)~~/g,          `${D}$1${R}`)
    // 链接：显示文字，URL 暗色附后
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      if (label.startsWith('http') || label === href) return `${D}${UN}${shortenUrl(href)}${R}`;
      return `${UN}${label}${R}${D} (${shortenUrl(href)})${R}`;
    })
    // 行内图片忽略
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '');
}

// ──────────────────────── 块级元素渲染函数 ───────────────────────────
function renderH1(text) {
  const t = text.replace(/[*#`]/g, '');
  const upper = t.toUpperCase();
  const line = '═'.repeat(Math.min(vlen(upper), TW - 2));
  return `\n\n${SP}${BL}${B}${upper}${R}\n${SP}${BL}${D}${line}${R}\n\n`;
}

function renderH2(text) {
  const t = inline(text.replace(/[*#`]/g, '').trim()).toUpperCase();
  const fill = Math.max(0, TW - vlen(t) - 6);
  return `\n${SP}${BL}${D}╌╌ ${R}${BL}${B}${t}${R}${BL}${D} ${'╌'.repeat(fill)}${R}\n\n`;
}

function renderH3(text) {
  return `\n${SP}${B}${inline(text)}${R}\n\n`;
}

function renderH4(text) {
  return `${SP}${D}${UN}${inline(text)}${R}\n\n`;
}

function renderParagraph(text) {
  const t = inline(text.replace(/\n/g, ' ').trim());
  return wrap(t, COL) + '\n\n';
}

function renderBulletItem(text, depth) {
  const bullets = ['▸', '◦', '–'];
  const bul = BL + bullets[Math.min(depth, 2)] + R;
  const ind = SP + '  '.repeat(depth);
  const restInd = ind + '   ';
  const t = inline(text);
  return wrap(t, COL - vlen(ind) - 3, `${ind}${bul} `, restInd) + '\n';
}

function renderOrderedItem(text, num, depth) {
  const prefix = `${BL}${B}${num}.${R}`;
  const ind = SP + '  '.repeat(depth);
  const restInd = ind + '   ';
  const t = inline(text);
  return wrap(t, COL - vlen(ind) - 4, `${ind}${prefix} `, restInd) + '\n';
}

function renderList(tok, depth = 0) {
  let out = '';
  for (let i = 0; i < tok.items.length; i++) {
    const item = tok.items[i];
    // 提取主文本（过滤掉子列表 token）
    const mainText = (item.tokens || [])
      .filter(t => t.type === 'text' || t.type === 'paragraph')
      .map(t => t.text || t.raw || '')
      .join(' ');

    if (tok.ordered) {
      out += renderOrderedItem(mainText || item.text, i + 1, depth);
    } else {
      out += renderBulletItem(mainText || item.text, depth);
    }

    // 嵌套列表
    for (const child of (item.tokens || [])) {
      if (child.type === 'list') out += renderList(child, depth + 1);
    }
  }
  return out + '\n';
}

function renderCode(code, lang) {
  const label = lang ? ` ${lang} ` : '';
  const barW = TW;
  const top = '┌' + (label ? `─${label}` : '') + '─'.repeat(Math.max(0, barW - vlen(label) - 1)) + '┐';
  const bot = '└' + '─'.repeat(barW) + '┘';
  const body = code.split('\n').map(l => {
    const pad = ' '.repeat(Math.max(0, barW - l.length - 1));
    return `${SP}${D}│${R} ${l}${pad}${D}│${R}`;
  }).join('\n');
  return `\n${SP}${D}${top}${R}\n${body}\n${SP}${D}${bot}${R}\n\n`;
}

function renderHr() {
  const dots = Array(Math.floor(TW / 2)).fill('·').join(' ');
  return `\n${SP}${BL}${D}${dots}${R}\n\n`;
}

function renderBlockquote(tokens) {
  const text = renderTokens(tokens).trim();
  return text.split('\n').map(l => `${SP}${BL}│${R}${D} ${l.trimStart()}${R}`).join('\n') + '\n\n';
}

function renderTable(header, rows) {
  // 简单渲染 table 为分隔行格式
  const renderRow = (cells) =>
    SP + D + '│' + R + ' ' + cells.map(c => inline(c.text || '')).join(` ${D}│${R} `) + '\n';
  const sep = SP + D + '├' + '─'.repeat(TW - 1) + '┤' + R + '\n';

  let out = '\n';
  out += renderRow(header);
  out += sep;
  for (const row of rows) out += renderRow(row);
  return out + '\n';
}

// ───────────────────────── Token 树渲染 ──────────────────────────────
function renderTokens(tokens) {
  let out = '';
  for (const tok of tokens) {
    switch (tok.type) {
      case 'heading':
        if      (tok.depth === 1) out += renderH1(tok.text);
        else if (tok.depth === 2) out += renderH2(tok.text);
        else if (tok.depth === 3) out += renderH3(tok.text);
        else                      out += renderH4(tok.text);
        break;
      case 'paragraph':
        out += renderParagraph(tok.text);
        break;
      case 'list':
        out += renderList(tok, 0);
        break;
      case 'code':
        out += renderCode(tok.text, tok.lang);
        break;
      case 'hr':
        out += renderHr();
        break;
      case 'blockquote':
        out += renderBlockquote(tok.tokens || []);
        break;
      case 'table':
        out += renderTable(tok.header, tok.rows);
        break;
      case 'space':
        break;
      default:
        if (tok.raw && tok.raw.trim()) out += renderParagraph(tok.raw);
    }
  }
  return out;
}

function renderMarkdown(md) {
  const { marked } = require('marked');
  return renderTokens(marked.lexer(md));
}

// ────────────────── 图片渲染（jimp 块字符，完全控制输出）────────────
async function renderImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());

    const { Jimp } = require('jimp');
    const img = await Jimp.fromBuffer(buf);

    const targetW = Math.floor(TW * 0.75);
    // 每个字符格高约为宽的 2 倍，用上下半块字符各代表 1 像素行
    const targetH = Math.max(1, Math.round(targetW * img.height / img.width / 2)) * 2;
    img.resize({ w: targetW, h: targetH });

    const rows = [];
    for (let y = 0; y < targetH; y += 2) {
      let line = '';
      for (let x = 0; x < targetW; x++) {
        const top = img.getPixelColor(x, y);
        const bot = img.getPixelColor(x, y + 1);
        const tr = (top >>> 24) & 0xff, tg = (top >>> 16) & 0xff, tb = (top >>> 8) & 0xff;
        const br = (bot  >>> 24) & 0xff, bg = (bot  >>> 16) & 0xff, bb = (bot  >>> 8) & 0xff;
        // 上半块用前景色，下半块用背景色
        line += `\x1b[38;2;${tr};${tg};${tb}m\x1b[48;2;${br};${bg};${bb}m▀`;
      }
      line += '\x1b[0m'; // 每行末尾重置颜色
      rows.push(line);
    }
    return rows;  // 返回行数组，由调用方逐行写入
  } catch { return null; }
}

// ───────────────── 将正文切分为文本段 + 图片段 ──────────────────────
async function render(markdown) {
  const parts = [];
  let last = 0;
  // 匹配 [![alt](img)](link) 或 ![alt](img)
  const re = /\[!\[([^\]]*)\]\(([^)\s"]+)[^)]*\)\]\([^)]*\)|!\[([^\]]*)\]\(([^)\s"]+)[^)]*\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    if (m.index > last) parts.push({ type: 'md', content: markdown.slice(last, m.index) });
    parts.push({ type: 'img', alt: m[1] ?? m[3], url: m[2] ?? m[4] });
    last = m.index + m[0].length;
  }
  if (last < markdown.length) parts.push({ type: 'md', content: markdown.slice(last) });

  for (const part of parts) {
    if (part.type === 'md') {
      if (!part.content.trim()) continue;
      process.stdout.write(renderMarkdown(part.content));
    } else {
      if (part.url.startsWith('data:') || part.url.length < 8) continue;
      const imgOut = await renderImage(part.url);
      if (imgOut) {
        const imgW = Math.floor(TW * 0.75);
        const pad = ' '.repeat(Math.max(0, COL - imgW));
        process.stdout.write('\r\n');
        for (const line of imgOut) {
          // 补空格至终端宽度，\r\n 保证光标归列 0
          process.stdout.write(line + pad + '\r\n');
        }
        process.stdout.write('\r\n');
      }
    }
  }
}

// ──────────────────────── Jina 元数据头部 ────────────────────────────
function extractJinaMeta(content) {
  const metaRe = /^(Title|URL Source|Published Time):\s*(.+)$/gm;
  const meta = {};
  let m;
  while ((m = metaRe.exec(content)) !== null) meta[m[1]] = m[2].trim();
  const bodyMatch = content.match(/^Markdown Content:\s*\n([\s\S]*)$/m);
  return { meta, body: bodyMatch ? bodyMatch[1] : content };
}

function printMeta(meta, rawUrl) {
  const domain = rawUrl.replace(/^https?:\/\//, '').split('/')[0];
  // 顶部状态栏
  const left  = `${D}${domain.toUpperCase()}${R}`;
  const right  = meta['Published Time'] ? `${D}${meta['Published Time']}${R}` : '';
  const gap    = COL - vlen(domain.toUpperCase()) - vlen(meta['Published Time'] || '');
  process.stdout.write(SP + left + ' '.repeat(Math.max(1, gap - PAD)) + right + '\n');

  // 大标题
  if (meta['Title']) {
    const title = meta['Title'].toUpperCase();
    process.stdout.write(`\n${SP}${BL}${B}${title}${R}\n`);
    process.stdout.write(`${SP}${BL}${D}${'═'.repeat(Math.min(vlen(title), TW))}${R}\n`);
  }

  // 分隔线
  const dots = Array(Math.floor(TW / 2)).fill('·').join(' ');
  process.stdout.write(`\n${SP}${BL}${D}${dots}${R}\n\n`);
}

// ─────────────────────────────── main ────────────────────────────────
async function main() {
  const url = process.argv[2];
  if (!url || url === '--help' || url === '-h') {
    process.stdout.write(`${B}termread${R} — 在终端阅读任意网页\n\n`);
    process.stdout.write(`用法: termread ${IT}<url>${R}\n`);
    process.stdout.write(`示例: termread https://x.com/akshay_pachaar/status/2041146899319971922\n`);
    process.exit(url ? 0 : 1);
  }

  const displayUrl = url.replace(/^https?:\/\//, '');
  process.stderr.write(`${D}⏳ 正在读取 ${displayUrl}…${R}`);

  try {
    const content = await fetchContent(url);
    process.stderr.write('\r\x1b[K');
    const { meta, body } = extractJinaMeta(content);
    if (Object.keys(meta).length) printMeta(meta, url);
    await render(body);
  } catch (err) {
    process.stderr.write('\r\x1b[K');
    process.stderr.write(`\x1b[31m错误: ${err.message}\x1b[0m\n`);
    process.exit(1);
  }
}

async function fetchContent(url) {
  const res = await fetch(`${JINA_PREFIX}${url}`, {
    headers: { 'Accept': 'text/markdown', 'X-Timeout': '30' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

main();
