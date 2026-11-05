import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { buildMotion } from '../lib/motion.mjs';
import { resolveMotionConfig } from '../lib/motion-model.mjs';

const HERE = import.meta.dirname;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = Number(process.env.CHROME_PORT || 9444);
const FPS = 30;
let DURATION = 18;
let TOTAL_FRAMES = FPS * DURATION;

const args = process.argv.slice(2);
const arg = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const specPath = path.resolve(arg('--spec'));
const outDir = path.resolve(arg('--out'));
const mode = arg('--mode', 'preview');
const previewScale = Number(arg('--preview-scale', '0.33')) || 0.33;
if (!fs.existsSync(specPath)) throw new Error('spec not found: ' + specPath);
fs.mkdirSync(outDir, { recursive: true });
const framesDir = path.join(outDir, 'frames');
if (mode === 'full') {
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
}

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const isFour = spec.page_count === 4;
const isFive = spec.page_count === 5;
const isSix = spec.page_count === 6;
DURATION = isSix ? 28 : (isFive ? 24 : (isFour ? 20 : (spec.quote?.line1 ? 21 : 18)));
TOTAL_FRAMES = FPS * DURATION;
const profileDir = path.join(outDir, '.chrome-profile');
fs.rmSync(profileDir, { recursive: true, force: true });
fs.mkdirSync(profileDir, { recursive: true });

const log = (obj) => console.log(JSON.stringify(obj));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const timing = (label) => console.error(`[timing] ${label} ${Date.now() - t0}ms`);

async function waitHttp(url, timeout = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(120);
  }
  throw new Error('Chrome DevTools did not start');
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        const list = this.events.get(msg.method) || [];
        for (const fn of list) fn(msg.params);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          rej(new Error('CDP timeout: ' + method));
        }
      }, 60000);
    });
  }
  once(method, timeout = 20000) {
    return new Promise((res, rej) => {
      const fn = (params) => {
        clearTimeout(tm);
        const arr = this.events.get(method) || [];
        const i = arr.indexOf(fn);
        if (i >= 0) arr.splice(i, 1);
        res(params);
      };
      const arr = this.events.get(method) || [];
      arr.push(fn);
      this.events.set(method, arr);
      const tm = setTimeout(() => rej(new Error('event timeout: ' + method)), timeout);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

function injectSpecScript(spec, motion) {
  const safeSpec = JSON.stringify(spec);
  const safeMotion = JSON.stringify(motion || {});
  return `(() => {
    const spec = ${safeSpec};
    window.MOTION = ${safeMotion};
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const allowBasic = (s) => String(s ?? '').replace(/<(?!\\/?(?:b|br)\\b)[^>]*>/gi, '');
    const setText = (el, v) => { if (el) el.textContent = String(v ?? ''); };
    const setHTML = (el, v) => { if (el) el.innerHTML = String(v ?? ''); };

    const meta1 = $('p1-meta');
    if (meta1?.children[0]) meta1.children[0].textContent = spec.meta.p1_left;
    if (meta1?.children[1]) meta1.children[1].textContent = spec.meta.p1_right;
    const meta2 = $('p2-meta');
    if (meta2?.children[0]) meta2.children[0].textContent = spec.meta.p2_left;
    if (meta2?.children[1]) meta2.children[1].textContent = spec.meta.p2_right;
    const meta3 = $('p3-meta');
    if (meta3?.children[0]) meta3.children[0].textContent = spec.meta.p3_left;
    if (meta3?.children[1]) meta3.children[1].textContent = spec.meta.p3_right;

    setHTML($('p1-kicker'), esc(spec.page1.kicker) + (spec.page1.kicker_accent ? '<b>' + esc(spec.page1.kicker_accent) + '</b>' : ''));
    const p1Raw = (spec.page1.lines || []).map(x => String(x || '').trim()).filter(Boolean);
    const headline = String(spec.page1.headline || '').trim();
    if (!p1Raw.length && headline) {
      const count = Math.max(2, Math.min(3, Number(spec.page1.max_lines) || 3));
      const chunk = Math.ceil(headline.length / count);
      for (let i = 0; i < headline.length; i += chunk) p1Raw.push(headline.slice(i, i + chunk));
    }
    const originalP1 = (spec.page1.lines || []).map(x => String(x || '').trim()).filter(Boolean);
    const p1 = [];
    for (const line of p1Raw) {
      if (line.length === 1 && p1.length) p1[p1.length - 1] += line;
      else p1.push(line);
    }
    if (p1.length > 1 && p1[0].length === 1) { p1[1] = p1[0] + p1[1]; p1.shift(); }
    // P1 hard rule: at most 9 chars per visual line; never end inside a word.
    const p1Max = 10;
    const joinedP1 = p1.join('');
    let p1Tokens = [...joinedP1];
    try {
      const seg = new Intl.Segmenter('zh', { granularity: 'word' });
      p1Tokens = [...seg.segment(joinedP1)].filter(x => x.segment.trim()).map(x => x.segment);
    } catch {}
    const tokenEnds = new Set();
    let running = 0;
    for (const t of p1Tokens) { running += t.length; tokenEnds.add(running); }
    if (p1.some(line => line.length > p1Max)) {
      const joined = joinedP1;
      let tokens = p1Tokens;
      const target = Math.max(2, Math.min(3, Math.ceil(joined.length / p1Max)));
      const linesOut = [];
      for (const token of tokens) {
        if (!linesOut.length || linesOut[linesOut.length - 1].length + token.length > p1Max) {
          if (linesOut.length >= target && linesOut.length) linesOut[linesOut.length - 1] += token;
          else linesOut.push(token);
        } else {
          linesOut[linesOut.length - 1] += token;
        }
      }
      while (linesOut.length > 3) {
        linesOut[linesOut.length - 2] += linesOut[linesOut.length - 1];
        linesOut.pop();
      }
      p1.length = 0;
      p1.push(...linesOut);
      spec.page1.lines = p1.slice(0, 3);
    }
    const l1 = $('p1-l1'), l2 = $('p1-l2'), l3 = $('p1-l3');
    if (l1) l1.textContent = p1[0] || '';
    if (l2) {
      if (spec.page1.quote_line2) l2.innerHTML = '<span class="q">「</span>' + esc(p1[1] || '') + '<span class="q">」</span>';
      else l2.textContent = p1[1] || '';
    }
    if (l3) {
      l3.textContent = p1[2] || '';
      l3.parentElement.style.display = p1[2] ? '' : 'none';
    }
    // Dense page-1 copy should not run under the decorative stamp.
    const dense = p1.join('').length > 15 || (p1[0] || '').length > 7;
    const stampCard = $('p1-stamp');
    if (stampCard) stampCard.style.display = dense ? 'none' : '';
    setText($('p1-addr'), spec.page1.addr_label);
    const ip = $('p1-ip');
    let p1Highlight = String(spec.page1.highlight || '').trim();
    if (p1Highlight.length > 8) {
      const p1All = p1.join('');
      const suffix6 = p1Highlight.slice(-6);
      p1Highlight = p1All.includes(suffix6) ? suffix6 : p1Highlight.slice(-8);
    }
    spec.page1.highlight = p1Highlight;
    if (ip) {
      ip.innerHTML = esc(p1Highlight) + (spec.page1.highlight_latin ? '<span class="latin">' + esc(spec.page1.highlight_latin) + '</span>' : '');
    }
    let coverV2 = null;
    const coverObj = spec.page1.cover;
    let coverPair = null;
    if (coverObj?.lead && coverObj?.punch) {
      coverPair = { lead: String(coverObj.lead).trim(), punch: String(coverObj.punch).trim() };
    } else if (spec.page1.cover_v2 === true && originalP1.length === 2 && originalP1[1] === p1Highlight) {
      coverPair = { lead: originalP1[0], punch: originalP1[1] };
    }
    if (coverPair) {
      const pad = document.querySelector('.p1 .pad');
      const h1 = pad?.querySelector('h1');
      if (pad && h1) {
        const box = document.createElement('div');
        box.className = 'cover-v2';
        box.innerHTML = '<div class="cover-lead">' + esc(coverPair.lead) + '</div><div class="cover-gap"></div>' +
          '<div class="cover-punch"><span class="cover-punch-text">' + esc(coverPair.punch) + '</span></div>';
        pad.insertBefore(box, h1);
        document.querySelector('.p1')?.classList.add('cover-v2-active');
        coverV2 = {
          punch: box.querySelector('.cover-punch-text')
        };
      }
    }
    setText($('p1-en'), spec.page1.en);
    setText($('p1-foot'), spec.page1.footnote);
    const stampWord = document.querySelector('#p1-stamp .stamp-word');
    if (stampWord) stampWord.innerHTML = esc(spec.page1.stamp_line1) + '<br><span>' + esc(spec.page1.stamp_line2) + '</span>';

    setHTML($('p2-kicker'), esc(spec.page2.kicker) + (spec.page2.kicker_accent ? '<b>' + esc(spec.page2.kicker_accent) + '</b>' : ''));
    const nas = $('p2-nas');
    if (nas) {
      setText(nas.querySelector('.tag'), spec.page2.left_tag);
      const lines = nas.querySelectorAll('.bigline');
      if (lines[0]) {
        if (spec.page2.left_thin) lines[0].innerHTML = '<span class="thin">' + esc(spec.page2.left_thin) + '</span>' + esc(spec.page2.left_line1_rest);
        else lines[0].textContent = spec.page2.left_line1_rest;
      }
      if (lines[1]) lines[1].textContent = spec.page2.left_line2;
    }
    setText($('p2-stamp'), spec.page2.left_stamp);

    const cloud = $('p2-cloud');
    if (cloud) {
      setText(cloud.querySelector('.tag'), spec.page2.right_tag);
    }
    const cloudLine = cloud?.querySelector('.bigline');
    if (cloudLine?.firstChild && cloudLine.firstChild.nodeType === 3) {
      cloudLine.firstChild.nodeValue = spec.page2.right_prefix;
    }
    setText($('p2-hl'), spec.page2.right_highlight);
    const tick = $('p2-tick');
    const xIcon = '<svg class="draw-icon x-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"><path d="M18 18 L82 82"/><path d="M82 18 L18 82"/></svg>';
    const checkIcon = '<svg class="draw-icon check-icon" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M12 54 L38 82 L88 18"/></svg>';
    if ($('p2-stamp')) $('p2-stamp').innerHTML = xIcon;
    if (tick) tick.innerHTML = checkIcon;

    setText($('p2-small'), spec.page2.conclusion_small);
    const big = $('p2-big');
    if (big?.firstChild && big.firstChild.nodeType === 3) big.firstChild.nodeValue = spec.page2.conclusion_prefix;
    setText($('p2-hl2'), spec.page2.conclusion_highlight);
    setHTML($('p2-foot'), allowBasic(spec.page2.footnote));

    // P2 v2: field-driven comparison page with a 24px typography floor.
    const p2pad = document.querySelector('.p2');
    if (p2pad && spec.page2.left_line1_rest && spec.page2.right_highlight) {
      const box = document.createElement('div');
      box.className = 'p2-v2';
      let p2vKicker = String(spec.page2.kicker || '').trim();
      if (!p2vKicker || /vs\.?$/i.test(p2vKicker)) {
        p2vKicker = String(spec.page2.left_tag || '') + ' vs. ' + String(spec.page2.right_tag || '');
      }
      const leftSetup = spec.page2.left_thin || spec.page2.left_line1_rest || '看起来是';
      const leftTurn = spec.page2.left_thin ? spec.page2.left_line1_rest : spec.page2.left_line2;
      const leftSub = spec.page2.left_thin ? spec.page2.left_line2 : (spec.page2.left_stamp || '');
      box.innerHTML =
        '<div class="p2v-kicker">' + esc(p2vKicker) + '</div>' +
        '<div class="p2v-body">' +
          '<div class="p2v-row">' +
            '<div class="p2v-mark bad">' + xIcon + '</div>' +
            '<div class="p2v-tag">' + esc(spec.page2.left_tag || '旧认知') + '</div>' +
            '<div class="p2v-setup">' + esc(leftSetup) + '</div>' +
            '<div class="p2v-turn" id="p2v-left-turn">' + esc(leftTurn || '') + '</div>' +
            '<div class="p2v-sub">' + esc(leftSub || '') + '</div>' +
          '</div>' +
          '<div class="p2v-row right">' +
            '<div class="p2v-mark good">' + checkIcon + '</div>' +
            '<div class="p2v-tag">' + esc(spec.page2.right_tag || '新认知') + '</div>' +
            '<div class="p2v-setup">' + esc(spec.page2.right_prefix || '其实是') + '</div>' +
            '<div class="p2v-turn"><span class="p2v-hl" id="p2v-right-turn">' + esc(spec.page2.right_highlight || '') + '</span></div>' +
            '<div class="p2v-sub">' + esc(spec.page2.right_badge || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="p2v-conclusion">' +
          '<small>' + esc(spec.page2.conclusion_small || '') + '</small>' +
          '<div>' + esc(spec.page2.conclusion_prefix || '') + '<b id="p2v-conclusion-hl">' + esc(spec.page2.conclusion_highlight || '') + '</b></div>' +
        '</div>' +
        '<div class="p2v-note">' + allowBasic(spec.page2.footnote || '') + '</div>';
      const conclHl = box.querySelector('#p2v-conclusion-hl');
      if (conclHl && conclHl.textContent.trim().length > 4) conclHl.classList.add('long');
      p2pad.appendChild(box);
      p2pad.classList.add('p2-v2-active');
      window.__p2vMarkPaths = [...box.querySelectorAll('.p2v-mark path')];
      for (const p of window.__p2vMarkPaths) {
        const len = p.getTotalLength ? p.getTotalLength() : 100;
        p.style.strokeDasharray = String(len);
        p.style.strokeDashoffset = String(len);
      }
    }

    const p3Data = (spec.page_count === 5 || spec.page_count === 6) ? (spec.evidence || {}) : (spec.page3 || {});
    setText($('p3-title'), p3Data.title || '先看一个具体场景');
    setText($('p3-kicker'), p3Data.subtitle || '证据 / 不是观点');
    setHTML($('p3-note'), allowBasic(p3Data.note || ''));
    setText($('p3-bottom'), p3Data.bottom || '能复现的，才叫证据。');
    if ((spec.page_count === 5 || spec.page_count === 6) && p3Data.title) {
      const p3page = document.querySelector('.p3');
      const cleanP3 = (v) => String(v || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      const parts = cleanP3(p3Data.note).split(/[；;。]/).flatMap(x => x.split(/，/)).map(x => x.trim()).filter(Boolean).slice(0, 3);
      const highlight = cleanP3(p3Data.highlight) || parts[1] || '';
      const box = document.createElement('div');
      box.className = 'p3-v2';
      box.innerHTML =
        '<div class="p3v-title">' + esc(cleanP3(p3Data.title)) + '</div>' +
        '<div class="p3v-body">' +
          parts.map((x, i) => '<div class="p3v-point' + (highlight && x.includes(highlight) ? ' hl' : '') + '">' + esc(x) + '</div>').join('') +
        '</div>' +
        '<div class="p3v-bottom">' + esc(cleanP3(p3Data.bottom)) + '</div>';
      p3page.appendChild(box);
      p3page.classList.add('p3-v2-active');
    }

    // Structure-specific evidence page. The first page and quote stay the
    // same; this is where contrast/causal/etc. get their own reading order.
    const structureType = spec.structure_type || 'analogy';
    const p3Pad = document.querySelector('.p3 .p3c-pad');
    if (p3Pad && (spec.page_count === 5 || spec.page_count === 6) && structureType !== 'analogy' && structureType !== 'contrast') {
      const structured = spec.structure_fields && spec.structure_fields[structureType];
      const parts = (Array.isArray(structured) && structured.length ? structured : String(p3Data.note || '').replace(/<[^>]*>/g, '').split(/[；;。]/).map(x => x.trim()).filter(x => x.length >= 2)).slice(0, 5);
      const title = String(p3Data.title || '').replace(/<[^>]*>/g, '').trim();
      const bottom = String(p3Data.bottom || '').replace(/<[^>]*>/g, '').trim();
      const items = (parts.length >= 2 ? parts : [title, parts[0] || bottom]).filter(Boolean).slice(0, 5);
      let html = '';
      if (structureType === 'checklist') {
        html = '<div class="sp-list">' + items.map(x => '<div class="sp-check"><i>✓</i><span>' + x + '</span></div>').join('') + '</div>';
      } else if (structureType === 'causal') {
        html = '<div class="sp-chain">' + items.slice(0, 3).map((x, i) => (i ? '<b>→</b>' : '') + '<span>' + x + '</span>').join('') + '</div>';
      } else if (structureType === 'boundary') {
        html = '<div class="sp-pair"><div><em>适用</em><span>' + (items[0] || title) + '</span></div><div><em>不适用</em><span>' + (items[1] || bottom) + '</span></div></div>';
      } else if (structureType === 'misconception') {
        html = '<div class="sp-pair"><div><em>误解</em><span>' + (items[0] || title) + '</span></div><div><em>纠正</em><span>' + (items[1] || bottom) + '</span></div></div>';
      }
      if (html) {
        const box = document.createElement('div');
        box.className = 'structure-page sp-' + structureType;
        box.innerHTML = html;
        const anchor = p3Pad.querySelector('.p3c-bottom');
        p3Pad.insertBefore(box, anchor || null);
        document.querySelector('.p3')?.classList.add('has-structure-page');
      }
    }
    if (spec.page_count === 5 || spec.page_count === 6) {
      const pm = $('p3-meta');
      if (pm) pm.innerHTML = '<span>0' + (spec.page_count === 6 ? 5 : 4) + ' / 证据</span><span>THE POINT</span>';
    }
    setText(document.querySelector('.hud .brand'), spec.brand);

    const keepPhrases = [
      spec.page1?.highlight, spec.page1?.highlight_latin,
      spec.page2?.right_highlight, spec.page2?.conclusion_highlight,
      spec.quote?.highlight,
      ...(spec.structure_fields ? Object.values(spec.structure_fields).flat() : []),
      '固定公网 IP', 'AI Agent', '知识库', '检索路径', '自动发布',
      '接入 AI', '接入AI', 'AI 接入', 'AI接入', '再接入',
      '判断', '签字', '初稿', '实习生', '查资料', '责任'
    ].map(x => String(x || '').trim()).filter(x => x.length >= 2);
    const protectPhrases = (root) => {
      if (!root || !keepPhrases.length) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      const segmenter = (() => {
        try { return new Intl.Segmenter('zh', { granularity: 'word' }); } catch { return null; }
      })();
      for (const node of nodes) {
        const raw = node.nodeValue || '';
        if (!raw.trim()) continue;
        const phrases = new Set(keepPhrases.filter(p => raw.includes(p)));
        if (segmenter) {
          for (const part of segmenter.segment(raw)) {
            if (part.isWordLike && part.segment.length >= 2) phrases.add(part.segment);
          }
        }
        if (!phrases.size) continue;
        const frag = document.createDocumentFragment();
        let rest = raw;
        while (rest) {
          let hit = null;
          for (const p of [...phrases].sort((a, b) => b.length - a.length)) {
            const at = rest.indexOf(p);
            if (at >= 0 && (!hit || at < hit.at || (at === hit.at && p.length > hit.p.length))) hit = { p, at };
          }
          if (!hit) { frag.appendChild(document.createTextNode(rest)); break; }
          if (hit.at > 0) frag.appendChild(document.createTextNode(rest.slice(0, hit.at)));
          const span = document.createElement('span');
          span.className = 'keep-phrase';
          span.textContent = hit.p;
          frag.appendChild(span);
          rest = rest.slice(hit.at + hit.p.length);
        }
        node.parentNode.replaceChild(frag, node);
      }
    };

    const layoutIssues = [];
    const fitLine = (el, max, min, label = '') => {
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const pr = parent.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const offset = Math.max(0, er.left - pr.left);
      const available = Math.max(80, pr.width - offset);
      if (!available) return;
      let size = max;
      el.style.fontSize = size + 'px';
      let guard = 0;
      const over = () => el.scrollWidth > available + 2 || el.getBoundingClientRect().width > available + 2;
      while (over() && size > min && guard++ < 120) {
        size -= 1;
        el.style.fontSize = size + 'px';
      }
      if (over()) {
        // Long Chinese/Latin highlights may still be wider at min font size.
        el.style.whiteSpace = 'normal';
        el.style.overflowWrap = 'anywhere';
        el.style.wordBreak = 'break-word';
        el.style.lineHeight = '1.05';
        el.style.maxWidth = '100%';
      }
    };
    fitLine(l1, 128, 72, 'p1-l1');
    fitLine(l2, 158, 78, 'p1-l2');
    fitLine(l3, 128, 72, 'p1-l3');
    fitLine(nas?.querySelectorAll('.bigline')[0], 116, 64, 'p2-left-1');
    fitLine(nas?.querySelectorAll('.bigline')[1], 116, 64, 'p2-left-2');
    fitLine(cloudLine, 124, 64, 'p2-right');
    fitLine(big, 84, 50, 'p2-big');
    fitLine(ip, 92, 32, 'p1-highlight');
    fitLine(document.getElementById('p2-hl'), 96, 36, 'p2-highlight');
    fitLine(document.getElementById('p2-hl2'), 84, 36, 'p2-conclusion-highlight');

    const fitPage = (selector) => {
      const pad = document.querySelector(selector + ' .pad');
      if (!pad) return;
      pad.style.zoom = '';
      let z = 1;
      while (pad.scrollHeight > pad.clientHeight + 2 && z > .78) {
        z -= .02;
        pad.style.zoom = z;
      }
    };
    fitPage('.p1');
    fitPage('.p2');

    const quote = spec.quote || {};
    const isFour = spec.page_count === 4;
    const isFive = spec.page_count === 5;
    const isSix = spec.page_count === 6;
    const hasQuote = Boolean(String(quote.line1 || '').trim()) || isFour || isFive || isSix;
    document.body.classList.toggle('has-quote', hasQuote);
    document.body.classList.add('theme-' + (spec.theme || 'archive'));
    document.body.classList.add('structure-' + (spec.structure_type || 'analogy'));
    const themeBg = { archive: '#F3EDE1', terminal: '#101112', editorial: '#C73520', noir: '#0B0B0B', earth: '#20362C' }[spec.theme] || '#000';
    document.documentElement.style.background = themeBg;
    document.body.style.background = themeBg;
    const stageEl = document.getElementById('stage');
    if (stageEl) stageEl.style.background = themeBg;
    document.body.classList.toggle('four-page', isFour);
    document.body.classList.toggle('five-page', isFive);
    document.body.classList.toggle('six-page', isSix);
    document.getElementById('track').style.width = isSix ? '6480px' : (isFive ? '5400px' : (hasQuote ? '4320px' : '3240px'));
    if (isFour || isFive || isSix) {
      const ctx = spec.context || {};
      setText($('ctx-title'), ctx.title || '先把背景说清楚');
      setText($('ctx-kicker'), ctx.subtitle || '为什么这件事现在会发生');
      setHTML($('ctx-note'), allowBasic(ctx.note || '先把场景、角色和限制讲清楚。'));
      setText($('ctx-bottom'), ctx.bottom || '背景不是铺垫，是判断的前提。');
      if (ctx.scene && ctx.roles && ctx.constraint) {
        const page = document.querySelector('.pctx');
        const box = document.createElement('div');
        box.className = 'ctx-v2';
        box.innerHTML =
          '<div class="ctxv-title">' + esc(ctx.title || '') + '</div>' +
          '<div class="ctxv-rows">' +
            '<div class="ctxv-row"><div class="ctxv-label">场景</div><div class="ctxv-value">' + esc(ctx.scene) + '</div></div>' +
            '<div class="ctxv-row"><div class="ctxv-label">角色</div><div class="ctxv-value">' + esc(ctx.roles) + '</div></div>' +
            '<div class="ctxv-row"><div class="ctxv-label">限制</div><div class="ctxv-value">' + esc(ctx.constraint) + '</div></div>' +
          '</div>' +
          '<div class="ctxv-bottom">' + esc(ctx.bottom || '') + '</div>';
        page.appendChild(box);
        page.classList.add('ctx-v2-active');
      }
    }
    if (isSix) {
      const p2m = document.querySelector('.p2 .meta .cn');
      if (p2m) p2m.textContent = '04 / 地址';
      const obj = spec.objection || {};
      setText($('obj-title'), obj.title || '那是不是所有场景都适用？');
      setText($('obj-kicker'), obj.subtitle || '反例 / 先把边界说清楚');
      setHTML($('obj-note'), allowBasic(obj.note || '这条结构有边界；不适用的时候，要明确说不适用。'));
      setText($('obj-bottom'), obj.bottom || '先承认例外，再谈结论。');
    }
    for (const [id, pageSel] of [['ctx-note', '.pctx'], ['obj-note', '.pobj'], ['p3-note', '.p3']]) {
      const note = document.getElementById(id);
      const page = document.querySelector(pageSel);
      if (note && page && String(note.textContent || '').length > 55) page.classList.add('focus-mode');
    }
    if (hasQuote) {
      setText($('p4-l1'), quote.line1);
      const line2 = String(quote.line2 || '');
      const hl = String(quote.highlight || '');
      const at = hl ? line2.indexOf(hl) : -1;
      if (at >= 0) {
        $('p4-l2').innerHTML = esc(line2.slice(0, at)) + '<span class="p4-red">' + esc(hl) + '</span>' +
          '<span class="p4-outline">' + esc(line2.slice(at + hl.length)) + '</span>';
      } else {
        $('p4-l2').textContent = line2;
      }
      setHTML($('p4-note'), allowBasic(quote.note || ''));
      const p4Cta = quote.cta || '关注 · 领取部署清单<br>把内容送到对的地方';
      setHTML($('p4-cta'), '有问题，评论区问<br><span class="p4-cta-sub">' + p4Cta + '</span>');
      $('p4-stamp').innerHTML = esc(quote.stamp || ('先有地址' + String.fromCharCode(10) + '再谈效率')).split(String.fromCharCode(10)).join('<br>');
      const p4Page = document.querySelector('.p4');
      if (p4Page && !p4Page.querySelector('.p4-ask')) {
        const ask = document.createElement('div');
        ask.className = 'p4-ask';
        ask.textContent = '有问题，评论区问';
        p4Page.appendChild(ask);
        window.__p4Ask = ask;
      }
    }
    for (const id of ['p1-l1', 'p1-l2', 'p1-l3']) fitLine($(id), 118, 72);
    for (const el of document.querySelectorAll('.p2 .bigline')) fitLine(el, 116, 62);
    if (hasQuote) {
      fitLine($('p4-l1'), 130, 80);
      fitLine($('p4-l2'), 130, 80);
    }
    for (const sel of ['#p1-l1', '#p1-l2', '#p1-l3', '#p1-ip', '#p2-big', '#p2-hl', '#p2-hl2', '#p2-kicker', '#ctx-title', '#ctx-note', '#obj-title', '#obj-note', '#p3-title', '#p3-note', '#p4-l1', '#p4-l2', '#p4-note']) {
      protectPhrases(document.querySelector(sel));
    }
    const autoFit = [
      ['#p1-ip', 126, 74], ['#p2-hl', 116, 54], ['#p2-hl2', 84, 44], ['#p2v-left-turn', 96, 60], ['#p2v-right-turn', 96, 60], ['#p2v-conclusion-hl', 60, 40], ['#p2-kicker', 36, 24],
      ['#ctx-title', 104, 58], ['#ctx-note', 24, 18],
      ['#obj-title', 104, 58], ['#obj-note', 24, 18],
      ['#p3-title', 118, 58], ['#p3-note', 24, 18],
      ['#p4-note', 20, 15]
    ];
    for (const [sel, max, min] of autoFit) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) fitLine(el, max, min);
    }
    const pageSelectors = isSix ? ['.p1', '.pctx', '.pobj', '.p2', '.p3', '.p4'] : (isFive ? ['.p1', '.pctx', '.p2', '.p3', '.p4'] : (isFour ? ['.p1', '.pctx', '.p2', '.p4'] : (hasQuote ? ['.p1', '.p2', '.p3', '.p4'] : ['.p1', '.p2', '.p3'])));
    const starts = isSix ? [0, 5.15, 10.15, 14.15, 20.15, 25.15] : (isFive ? [0, 5.15, 10.15, 16.15, 21.15] : (isFour ? [0, 5.15, 10.15, 17.15] : [0, 5.15, 11.15, 17.15]));
    window.__p2vStart = starts[2] + 1.05;
    window.__p4AskStart = starts[starts.length - 1] + 1.1;
    const elementNodes = [];
    const motionPool = ['drop', 'rise', 'slide', 'sway', 'orbit', 'pulse', 'flip', 'draw', 'rotate'];
    const usedMotions = new Set();
    for (const item of (spec.elements || [])) {
      const available = motionPool.filter(m => !usedMotions.has(m));
      item.motion = available.length
        ? available[Math.floor(Math.random() * available.length)]
        : motionPool[Math.floor(Math.random() * motionPool.length)];
      usedMotions.add(item.motion);
      const pageIndex = (Number(item.page) || 1) - 1;
      const page = document.querySelector(pageSelectors[pageIndex]);
      if (!page) continue;
      page.style.position = 'relative';
      const layer = document.createElement('div');
      layer.className = 'el-layer';
      page.appendChild(layer);
      const node = document.createElement('div');
      node.className = 'el-item';
      node.style.width = (Number(item.size) || 600) + 'px';
      node.style.height = (Number(item.size) || 600) + 'px';
      node.style.opacity = '0';
      node.style.color = item.color || 'var(--element-ink, var(--ink))';
      node.innerHTML = item.svg || '';
      layer.appendChild(node);
      const start = starts[pageIndex] || 0;
      const end = starts[pageIndex + 1] || DURATION;
      elementNodes.push({
        node, item, start,
        duration: Math.max(2.6, end - start),
        seed: Math.floor(Math.random() * 1e9),
        phase: Math.random() * Math.PI * 2,
        amp: 110 + Math.random() * 280,
        speed: Math.max(.02, Math.min(.8, (Number(item.speed) || (.3 + Math.random() * .35)) * Math.max(.06, Math.min(2, Number(window.MOTION?.elementSpeed) || 1)))),
        pathOffset: Math.random()
      });
    }
    window.__updateElements = (t) => {
      const W = 1080, H = 1920;
      for (let i = 0; i < elementNodes.length; i++) {
        const { node, item, start, duration, seed, phase, amp, speed, pathOffset } = elementNodes[i];
        const local = t - start;
        if (local < 0) { node.style.opacity = '0'; continue; }
        const size = Number(item.size) || 600;
        // A full-page, looping trajectory. Every render gets new seeds/phase/speed.
        const rawP = (local / Math.max(2.2, duration * speed)) * (item.direction || 1) + pathOffset;
        const p = ((rawP % 1) + 1) % 1;
        const move = item.motion || 'breathe';
        let x = 540 - size / 2, y = 960 - size / 2, scale = 1, rotate = 0, scaleX = 1;
        if (move === 'drop') {
          x = 60 + (seed % 5) * 170 + Math.sin(p * Math.PI * 2.6 + phase) * (amp * .65);
          y = -size + p * (H + size * 2);
          scale = .9 + .18 * Math.sin(p * Math.PI * 2 + seed);
          rotate = Math.sin(p * Math.PI * 2 + seed) * 8;
        } else if (move === 'rise') {
          x = 80 + (seed % 4) * 200 + Math.sin(p * Math.PI * 2.4 + seed) * 160;
          y = H - p * (H + size * 2);
          scale = .9 + .2 * Math.sin(p * Math.PI * 2 + seed);
          rotate = Math.cos(p * Math.PI * 2 + seed) * 7;
        } else if (move === 'slide') {
          x = -size + p * (W + size * 2);
          y = 180 + (seed % 5) * 260 + Math.sin(p * Math.PI * 3 + seed) * 180;
          rotate = Math.sin(p * Math.PI * 2 + seed) * 10;
        } else if (move === 'sway') {
          x = 540 + Math.sin(p * Math.PI * 3 + seed) * 480 - size / 2;
          y = 220 + p * (H - 440) + Math.cos(p * Math.PI * 2 + seed) * 130;
          rotate = Math.sin(p * Math.PI * 2.5 + seed) * 14;
        } else if (move === 'orbit') {
          const a = p * Math.PI * 2 + seed;
          x = 540 + Math.cos(a) * 390 - size / 2;
          y = 960 + Math.sin(a) * 610 - size / 2;
          rotate = (a * 180 / Math.PI) % 360;
        } else if (move === 'pulse') {
          x = 540 - size / 2 + Math.sin(p * Math.PI * 2 + seed) * 150;
          y = 960 - size / 2 + Math.cos(p * Math.PI * 2 + seed) * 220;
          scale = .22 + Math.abs(Math.sin(p * Math.PI * 2 + seed)) * 1.35;
        } else if (move === 'flip') {
          x = -size + p * (W + size * 2);
          y = 840 + Math.sin(p * Math.PI * 2 + seed) * 300;
          scaleX = .55 + .45 * Math.abs(Math.cos(p * Math.PI * 2 + seed));
        } else if (move === 'draw') {
          x = 80 + (seed % 3) * 240 + Math.sin(p * Math.PI * 2 + seed) * 100;
          y = 220 + p * 1400;
          scale = .35 + .9 * Math.abs(Math.sin(p * Math.PI + seed));
        } else if (move === 'rotate') {
          x = 540 + Math.sin(p * Math.PI * 2 + seed) * 260 - size / 2;
          y = 960 + Math.cos(p * Math.PI * 2 + seed) * 420 - size / 2;
          rotate = p * 540;
        } else {
          x = 540 - size / 2 + Math.sin(p * Math.PI * 3 + seed) * 260;
          y = 200 + p * 1500;
          scale = .75 + .25 * Math.sin(p * Math.PI * 2 + seed);
          rotate = Math.sin(p * Math.PI * 2 + seed) * 12;
        }
        const fade = Math.min(1, Math.max(0, local / .35));
        node.style.opacity = ((Number(item.opacity) || .85) * fade).toFixed(3);
        node.style.transformOrigin = '50% 50%';
        node.style.transform = 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + (scale * scaleX).toFixed(4) + ') rotate(' + rotate.toFixed(2) + 'deg)';
        window.__elementDebug = { t, opacity: node.style.opacity, motion: move, p: Number(p.toFixed(3)) };
      }
    };
    const textTargets = isSix
      ? ['#p1-l2', '#ctx-title', '#obj-title', '#p2-big', '#p3-title', '#p4-l1']
      : (isFive
        ? ['#p1-l2', '#ctx-title', '#p2-big', '#p3-title', '#p4-l1']
        : (isFour
          ? ['#p1-l2', '#ctx-title', '#p2-big', '#p4-l1']
          : ['#p1-l2', '#p2-big', '#p3-title', '#p4-l1']));
    const directions = [
      { x: -980, y: 0, name: 'left' },
      { x: 980, y: 0, name: 'right' },
      { x: 0, y: -720, name: 'top' }
    ];
    const textSlides = [];
    let lastDirection = -1;
    for (let i = 0; i < textTargets.length; i++) {
      const el = document.querySelector(textTargets[i]);
      if (!el) continue;
      const choices = directions.map((_, idx) => idx).filter(idx => idx !== lastDirection);
      const dirIndex = choices[Math.floor(Math.random() * choices.length)];
      lastDirection = dirIndex;
      const dir = directions[dirIndex];
      el.dataset.textSlide = dir.name;
      const exitSide = Math.floor(Math.random() * 3);
      const exitOffset = exitSide === 0 ? [-620, 0] : (exitSide === 1 ? [620, 0] : [0, -380]);
      textSlides.push({
        el, start: starts[i] || 0, end: starts[i + 1] || DURATION,
        x: dir.x, y: dir.y, name: dir.name,
        exitX: exitOffset[0], exitY: exitOffset[1],
        phase: Math.random() * Math.PI * 2
      });
    }
    const smallSlides = [];
    pageSelectors.forEach((sel, pageIndex) => {
      const page = document.querySelector(sel);
      if (!page) return;
      const labels = [...page.querySelectorAll('.meta, .kicker, .ctxc-meta, .ctxc-kicker, .objc-meta, .objc-kicker, .p3c-meta, .p3c-kicker, .p4-meta')].slice(0, 2);
      labels.forEach((el, j) => {
        const side = Math.floor(Math.random() * 3);
        const offset = side === 0 ? [-180, 0] : (side === 1 ? [180, 0] : [0, -90]);
        el.dataset.smallSlide = '1';
        smallSlides.push({ el, start: starts[pageIndex] || 0, x: offset[0], y: offset[1], delay: j * .08 });
      });
    });
    const p2Page = document.querySelector('.p2');
    if (p2Page) {
      const leftLen = [spec.page2.left_line1_rest, spec.page2.left_line2].filter(Boolean).join('').length;
      const rightLen = [spec.page2.right_prefix, spec.page2.right_highlight].filter(Boolean).join('').length;
      const longest = Math.max(leftLen, rightLen);
      // Deterministic primitive choice: long copy gets vertical space,
      // short copy can use horizontal/diagonal composition.
      let mode = 'compare-vertical';
      if (spec.theme !== 'editorial') {
        if (longest <= 5 && leftLen + rightLen <= 10) mode = 'compare-horizontal';
        else if (longest <= 7 && leftLen + rightLen <= 14) mode = 'compare-diagonal';
      }
      p2Page.classList.add(mode);
      p2Page.dataset.primitive = mode.replace('compare-', '');
    }
    const markPrimitive = (sel, name) => { const el = document.querySelector(sel); if (el) el.dataset.primitive = name; };
    markPrimitive('.p1', 'single-column');
    markPrimitive('.pctx', 'context');
    markPrimitive('.pobj', 'objection');
    markPrimitive('.p3', spec.structure_type || 'evidence');
    markPrimitive('.p4', 'quote');
    const centerCandidates = ['.pctx', '.pobj', '.p3'].filter(sel => {
      const el = document.querySelector(sel);
      return el && getComputedStyle(el).display !== 'none';
    });
    if (centerCandidates.length) {
      document.querySelector(centerCandidates[Math.floor(Math.random() * centerCandidates.length)])?.classList.add('center-mode');
    }
    window.__updateTextSlides = (t) => {
      for (const item of textSlides) {
        const local = t - item.start;
        if (local < 0) {
          item.el.style.translate = item.x + 'px ' + item.y + 'px';
          item.el.style.opacity = '0';
          continue;
        }
        const p = Math.min(1, local / 1.0);
        const ease = 1 - Math.pow(1 - p, 3);
        const driftX = p >= 1 ? Math.sin(t * .7 + item.phase) * 2.2 : 0;
        const driftY = p >= 1 ? Math.cos(t * .55 + item.phase) * 1.4 : 0;
        const exitStart = item.end - .55;
        let tx = item.x * (1 - ease) + driftX;
        let ty = item.y * (1 - ease) + driftY;
        let opacity = 1;
        if (t > exitStart) {
          const q = Math.min(1, (t - exitStart) / .55);
          const e = q * q;
          tx += item.exitX * e;
          ty += item.exitY * e;
          opacity = 1 - e;
        }
        item.el.style.translate = tx.toFixed(2) + 'px ' + ty.toFixed(2) + 'px';
        item.el.style.opacity = opacity.toFixed(3);
      }
    };
    const p2PageIndex = isSix ? 3 : (isFive ? 2 : (isFour ? 2 : 1));
    const p2Start = starts[p2PageIndex] || 0;
    const drawPaths = [...document.querySelectorAll('.p2 .draw-icon path')].map(p => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = String(len);
      p.style.strokeDashoffset = String(len);
      return { p, len };
    });
    window.__updateDrawIcons = (t) => {
      const local = t - p2Start;
      for (let i = 0; i < drawPaths.length; i++) {
        const { p, len } = drawPaths[i];
        const isCheck = p.closest('.check-icon');
        const start = isCheck ? .45 : 0;
        const end = isCheck ? 1.35 : .78;
        const q = Math.max(0, Math.min(1, (local - start) / (end - start)));
        p.style.strokeDashoffset = String(len * (1 - q));
      }
    };
    window.__updateCoverV2 = (t) => {
      if (!coverV2) return;
      const enter = Math.max(0, Math.min(1, (t - .55) / .55));
      const brush = Math.max(0, Math.min(1, (t - 2.1) / .60));
      const ease = 1 - Math.pow(1 - enter, 3);
      coverV2.punch.style.opacity = ease.toFixed(3);
      coverV2.punch.style.transform = 'translateX(' + ((1 - ease) * 90).toFixed(2) + 'px)';
      coverV2.punch.style.setProperty('--brush', brush.toFixed(3));
      coverV2.punch.style.color = brush > .55 ? '#101112' : 'var(--ink)';
    };

    window.__updateP4Ask = (t) => {
      if (!window.__p4Ask) return;
      const p = Math.max(0, Math.min(1, (t - (window.__p4AskStart || 22) - .7) / .5));
      window.__p4Ask.style.opacity = p.toFixed(3);
    };

    window.__updateP2V = (t) => {
      const paths = window.__p2vMarkPaths || [];
      if (!paths.length) return;
      const p = Math.max(0, Math.min(1, (t - (window.__p2vStart || 10.15) - .45) / .65));
      const ease = 1 - Math.pow(1 - p, 3);
      for (const path of paths) {
        const len = path.getTotalLength ? path.getTotalLength() : 100;
        path.style.strokeDashoffset = String(len * (1 - ease));
      }
    };

    window.__updateSmallText = (t) => {
      for (const item of smallSlides) {
        const local = t - item.start - item.delay;
        if (local < 0) { item.el.style.opacity = '0'; item.el.style.translate = item.x + 'px ' + item.y + 'px'; continue; }
        const p = Math.min(1, local / .7);
        const ease = 1 - Math.pow(1 - p, 3);
        item.el.style.opacity = ease.toFixed(3);
        item.el.style.translate = (item.x * (1 - ease)).toFixed(2) + 'px ' + (item.y * (1 - ease)).toFixed(2) + 'px';
      }
    };
    const baseRenderAt = window.renderAt;
    window.renderAt = (t) => {
      baseRenderAt(t);
      window.__updateElements(t);
      window.__updateTextSlides(t);
      window.__updateSmallText(t);
      window.__updateDrawIcons(t);
      window.__updateCoverV2(t);
      window.__updateP2V(t);
      window.__updateP4Ask(t);
      window.__updateHighlights(t);
    };
    window.__updateHighlights = (t) => {
      document.querySelectorAll('.p2v-hl, .p3v-point.hl, .p4-red').forEach(el => {
        const page = el.closest('.page');
        const idx = pageSelectors.findIndex(sel => document.querySelector(sel) === page);
        const start = idx >= 0 ? (starts[idx] || 0) : 0;
        const local = t - start;
        let p;
        if (el.classList.contains('p2v-hl')) p = (local - 1.55) / .65;
        else if (el.classList.contains('p4-red')) p = (local - 1.25) / .55;
        else p = (local - 1.45) / .55;
        p = Math.max(0, Math.min(1, p));
        const q = 1 - Math.pow(1 - p, 3);
        el.style.backgroundSize = (q * 100).toFixed(2) + '% 100%';
        el.style.color = q > .55 ? '#101112' : 'var(--ink)';
      });
    };
    window.setDuration(isSix ? 28 : (isFive ? 24 : (isFour ? 20 : (hasQuote ? 21 : 18))));
    window.renderAt(0);

    const textIds = ['p1-l1', 'p1-l2', 'p1-l3', 'p1-ip', 'p1-foot', 'p2-hl', 'p2-hl2', 'p2-foot', 'p3-note', 'p3-bottom'];
    if (isFour || isFive || isSix) textIds.push('ctx-title', 'ctx-note', 'ctx-bottom');
    if (isSix) textIds.push('obj-title', 'obj-note', 'obj-bottom');
    if (hasQuote) textIds.push('p4-l1', 'p4-l2', 'p4-note');
    for (const pageSel of pageSelectors) {
      const page = document.querySelector(pageSel);
      if (!page) continue;
      const pr = page.getBoundingClientRect();
      for (const id of textIds) {
        const el = page.querySelector('#' + id);
        if (!el || !el.textContent.trim()) continue;
        if (el.dataset.textSlide || el.closest('[data-text-slide]')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > pr.right - 18 || r.left < pr.left + 18) {
          layoutIssues.push({ id, text: String(el.textContent || '').slice(0, 40), reason: '超出页面安全区' });
        }
        if (['p1-l1', 'p1-l2', 'p1-l3'].includes(id) && String(el.textContent || '').trim().length === 1) {
          layoutIssues.push({ id, text: String(el.textContent || ''), reason: '单字成行' });
        }
      }
    }
    const expectedText = [
      ['p1-l1', (spec.page1?.lines || [])[0]],
      ['p1-l2', (spec.page1?.lines || [])[1]],
      ['p1-l3', (spec.page1?.lines || [])[2]],
      ['p2-hl', spec.page2?.right_highlight],
      ['p2-hl2', spec.page2?.conclusion_highlight],
      ['ctx-title', spec.context?.title],
      ['p3-title', (spec.page_count === 5 || spec.page_count === 6) ? spec.evidence?.title : spec.page3?.title],
      ['obj-title', spec.objection?.title],
      ['p4-l1', spec.quote?.line1]
    ];
    for (const [id, expected] of expectedText) {
      const el = document.getElementById(id);
      const want = String(expected || '').replace(/<[^>]*>/g, '').replace(/\s+/g, '');
      if (!el || !want) continue;
      const got = String(el.textContent || '').replace(/\s+/g, '');
      if (!got.includes(want.slice(0, Math.min(10, want.length)))) {
        layoutIssues.push({ id, text: want.slice(0, 24), reason: '文字未完整渲染' });
      }
    }
    window.__layoutIssues = layoutIssues.slice(0, 20);
    return {
      ok: true, spec: spec.brand, layout_issues: window.__layoutIssues,
      debug_pages: {
        body: document.body.className,
        track_width: document.getElementById('track').style.width,
        p4_display: getComputedStyle(document.querySelector('.p4')).display,
        p4_left: document.querySelector('.p4').getBoundingClientRect().left,
        p3_left: document.querySelector('.p3').getBoundingClientRect().left,
        elements: elementNodes.length,
        element_slots: elementNodes.map(x => x.item.slot),
        element_motions: elementNodes.map(x => x.item.motion),
        text_directions: textSlides.map(x => x.name),
        p2_box: (() => { const p = document.querySelector('.p2')?.getBoundingClientRect(); return p ? [p.left, p.top, p.width, p.height] : null; })(),
        cover_v2_debug: (() => { const p = document.querySelector('.p1'); const h = document.querySelector('.p1 h1'); return { cls: p?.className || '', h1: h ? getComputedStyle(h).display : 'none', cover: !!document.querySelector('.cover-v2') }; })(),
        p4_l1_debug: (() => { const e = document.getElementById('p4-l1'); if (!e) return null; const r = e.getBoundingClientRect(); const q = document.querySelector('.p4-quote'); const qr = q?.getBoundingClientRect(); const p4 = document.querySelector('.p4'); const pr = p4?.getBoundingClientRect(); return { text: e.textContent, display: getComputedStyle(e).display, color: getComputedStyle(e).color, transform: getComputedStyle(e).transform, position: getComputedStyle(e).position, float: getComputedStyle(e).float, margin: getComputedStyle(e).margin, width: getComputedStyle(e).width, rect: [r.x, r.y, r.width, r.height], quote: qr ? [qr.x, qr.y, qr.width, qr.height] : null, page: pr ? [pr.x, pr.y, pr.width, pr.height] : null }; })(),
        p2_bg: (() => { const p = document.querySelector('.p2'); return p ? [getComputedStyle(p).backgroundColor, getComputedStyle(p).opacity] : null; })(),
        body_bg: (() => [getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).backgroundColor])(),
        p2_hl_box: (() => { const p = document.getElementById('p2-hl')?.getBoundingClientRect(); return p ? [p.left, p.top, p.width, p.height] : null; })(),
        p2_hl2_box: (() => { const p = document.getElementById('p2-hl2')?.getBoundingClientRect(); return p ? [p.left, p.top, p.width, p.height] : null; })(),
        p2_hl2_chain: (() => { const out = []; let el = document.getElementById('p2-hl2'); while (el && out.length < 6) { const r = el.getBoundingClientRect(); out.push([el.className || el.id, Math.round(r.left), Math.round(r.width), getComputedStyle(el).position]); el = el.parentElement; } return out; })(),
        element_state: window.__elementDebug || null,
        element_debug: elementNodes[0] ? {
          opacity: elementNodes[0].node.style.opacity,
          rect: [elementNodes[0].node.getBoundingClientRect().left, elementNodes[0].node.getBoundingClientRect().top, elementNodes[0].node.getBoundingClientRect().width, elementNodes[0].node.getBoundingClientRect().height],
          z: getComputedStyle(elementNodes[0].node.parentElement).zIndex
        } : null
      }
    };
  })()`;
}

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-features=CalculateNativeWinOcclusion',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1080,1920',
  '--allow-file-access-from-files',
  '--disable-gpu',
  '--font-render-hinting=none',
  'about:blank'
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeErr = '';
chrome.stderr.on('data', d => { chromeErr += d.toString(); });
let cdp;
try {
  timing('chrome-spawned');
  await waitHttp(`http://127.0.0.1:${PORT}/json/version`);
  timing('devtools-ready');
  const pages = await waitHttp(`http://127.0.0.1:${PORT}/json/list`);
  const target = pages.find(p => p.type === 'page');
  if (!target) throw new Error('No page target');
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false,
    screenWidth: 1080, screenHeight: 1920
  });
  const suffix = spec.renderer === 'hybrid' ? '-hybrid' : '';
  const templateName = spec.page_count === 6 ? 'template-6page' + suffix + '.html' : (spec.page_count === 5 ? 'template-5page' + suffix + '.html' : (spec.page_count === 4 ? 'template-4page' + suffix + '.html' : 'template.html'));
  const templateUrl = 'file:///' + path.join(HERE, templateName).replaceAll('\\', '/') + '?v=' + Date.now();
  await cdp.send('Page.navigate', { url: templateUrl });
  timing('navigate-sent');
  await cdp.once('Page.loadEventFired');
  timing('load-event');

  const evalJS = async (expression, awaitPromise = false) => {
    const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 800));
    return r.result?.value;
  };

  await evalJS('document.fonts.ready.then(() => true)', true);
  timing('fonts-ready');
  const musicTrack = typeof spec.music === 'string' ? spec.music : (spec.music?.track || 'bgm');
  const waveFile = path.join(HERE, `waveform-${musicTrack}.js`);
  if (fs.existsSync(waveFile)) {
    const txt = fs.readFileSync(waveFile, 'utf8');
    const json = txt.replace(/^window\.WAVEFORM=/, '').replace(/;\s*$/, '');
    await evalJS(`window.WAVEFORM=${json}; true`);
  }
  const motion = buildMotion(spec.motion?.preset || 'flow', spec.motion || {});
  motion.elementSpeed = resolveMotionConfig(spec.motion).elementSpeed;
  const applied = await evalJS(injectSpecScript(spec, motion), false);
  if (!applied?.ok) throw new Error('applySpec failed');
  const layoutIssues = applied.layout_issues || [];
  const debugPages = applied.debug_pages || null;
  timing('spec-applied');
  await sleep(300);

  if (mode === 'themes') {
    const themes = ['archive', 'terminal', 'editorial'];
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      await evalJS(`document.body.classList.remove('theme-archive','theme-terminal','theme-editorial'); document.body.classList.add('theme-${theme}'); window.renderAt(2.8); true`);
      await sleep(80);
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: 1080, height: 1920, scale: previewScale }
      });
      const p = path.join(outDir, `preview-theme-${theme}.png`);
      fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
      log({ type: 'preview', index: i + 1, path: p, theme });
      log({ type: 'progress', current: i + 1, total: themes.length, stage: 'theme' });
    }
    log({ type: 'done', mode, previews: themes.length, layout_issues: layoutIssues, debug_pages: debugPages });
  } else if (mode === 'preview') {
    const times = arg('--times') ? arg('--times').split(',').map(Number).filter(Number.isFinite) : (isSix ? [2.8, 7.8, 12.2, 17.2, 23.2, 26.8] : (isFive ? [2.8, 8.0, 13.0, 18.8, 22.8] : (isFour ? [2.8, 8.8, 15.2, 19.2] : (spec.quote?.line1 ? [2.8, 8.8, 15.2, 19.2] : [2.8, 8.8, 15.2]))));
    for (let i = 0; i < times.length; i++) {
      log({ type: 'progress', current: i, total: times.length, stage: 'frame' });
      await evalJS(`window.renderAt(${times[i]}); if(window.__updateElements) window.__updateElements(${times[i]}); true`);
      timing('renderAt-' + i);
      await sleep(40);
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: 1080, height: 1920, scale: previewScale }
      });
      timing('screenshot-' + i);
      const p = path.join(outDir, `preview-${i + 1}.png`);
      fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
      log({ type: 'progress', current: i + 1, total: times.length, stage: 'frame' });
    }
    log({ type: 'done', mode, previews: times.length, layout_issues: layoutIssues, debug_pages: debugPages });
  } else {
    const started = Date.now();
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      await evalJS(`window.renderAt(${i / FPS}); true`);
      await sleep(4);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 88, fromSurface: true, captureBeyondViewport: false });
      fs.writeFileSync(path.join(framesDir, `frame_${String(i).padStart(5, '0')}.jpg`), Buffer.from(shot.data, 'base64'));
      if (i % 15 === 0 || i === TOTAL_FRAMES - 1) log({ type: 'progress', current: i + 1, total: TOTAL_FRAMES, sec: Math.round((Date.now() - started) / 1000) });
    }
    const coverSrc = path.join(framesDir, 'frame_00090.jpg');
    const coverDst = path.join(outDir, 'cover.jpg');
    if (fs.existsSync(coverSrc)) fs.copyFileSync(coverSrc, coverDst);
    for (const [i, sec] of (spec.quote?.line1 ? [2.8, 8.8, 15.2, 19.2] : [2.8, 8.8, 15.2]).entries()) {
      const src = path.join(framesDir, `frame_${String(Math.round(sec * FPS)).padStart(5, '0')}.jpg`);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, `preview-${i + 1}.jpg`));
    }

    const videoPath = path.join(outDir, 'video.mp4');
    let bgm = path.join(HERE, 'assets', musicTrack === 'pulse' ? 'music-pulse.wav' : 'bgm.wav');
    if (musicTrack !== 'pulse' && musicTrack !== 'minimal' && musicTrack !== 'none') {
      const libPath = path.join(HERE, '..', 'data', 'music', 'library.json');
      try {
        const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
        const entry = lib.find(t => t.id === musicTrack);
        if (entry?.file) bgm = path.join(HERE, '..', 'data', 'music', entry.file);
      } catch {}
    }
    const useAudio = musicTrack !== 'none' && fs.existsSync(bgm);
    const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'frame_%05d.jpg')];
    if (useAudio) ffArgs.push('-stream_loop', '-1', '-i', bgm);
    const pageStarts = isSix ? [0, 5.15, 10.15, 14.15, 20.15, 25.15] : (isFive ? [0, 5.15, 10.15, 16.15, 21.15] : (isFour ? [0, 5.15, 10.15, 17.15] : [0, 5.15, 11.15, 17.15]));
    const whoosh = path.join(HERE, 'assets', 'whoosh.wav');
    const sfxTimes = [...new Set((spec.elements || [])
      .map(e => pageStarts[(Number(e.page) || 1) - 1] + 0.08)
      .filter(t => Number.isFinite(t) && t >= 0 && t < DURATION - 0.5))];
    if (useAudio && sfxTimes.length && fs.existsSync(whoosh)) {
      for (let i = 0; i < sfxTimes.length; i++) ffArgs.push('-i', whoosh);
      const parts = ['[1:a]volume=1[bg]'];
      sfxTimes.forEach((sec, i) => {
        const ms = Math.round(sec * 1000);
        parts.push(`[${i + 2}:a]adelay=${ms}|${ms},volume=0.22[s${i}]`);
      });
      const labels = sfxTimes.map((_, i) => `[s${i}]`).join('');
      parts.push(`[bg]${labels}amix=inputs=${sfxTimes.length + 1}:duration=first:dropout_transition=0[aout]`);
      ffArgs.push('-filter_complex', parts.join(';'), '-map', '0:v:0', '-map', '[aout]');
    }
    ffArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2');
    if (useAudio) ffArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    else ffArgs.push('-an');
    ffArgs.push('-movflags', '+faststart', '-metadata', `title=${spec.brand || 'FIXED ADDRESS'}`, videoPath);
    log({ type: 'encode_start' });
    const ff = spawnSync('ffmpeg', ffArgs, { encoding: 'utf8' });
    if (ff.status !== 0) throw new Error('ffmpeg failed: ' + (ff.stderr || '').slice(-1000));
    const hash = crypto.createHash('sha256').update(fs.readFileSync(videoPath)).digest('hex');
    log({ type: 'done', mode, video: videoPath, cover: coverDst, sha256: hash, duration: DURATION, layout_issues: layoutIssues });
  }
  cdp.close();
} catch (e) {
  log({ type: 'error', message: String(e?.stack || e), chrome: chromeErr.slice(-1500) });
  process.exitCode = 1;
} finally {
  try { chrome.kill(); } catch {}
  await sleep(250);
  // Chrome child processes can keep the Node event loop alive on Windows.
  // The parent process has already emitted its done/error line, so force a clean exit.
  process.exit(process.exitCode || 0);
}





