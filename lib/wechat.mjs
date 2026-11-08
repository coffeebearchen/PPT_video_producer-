import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  db, ROOT, DATA_DIR, getSettings, getWechatAccount, getDefaultWechatAccount, jsonParse, jsonString, now
} from './db.mjs';

const API = 'https://api.weixin.qq.com';
const tokenCache = new Map();

function creds(accountId = '') {
  const acc = (accountId ? getWechatAccount(accountId) : getDefaultWechatAccount()) || getDefaultWechatAccount();
  if (!acc) return { appid: '', secret: '', author: '固定地址', dryRun: true, autoSubmit: false, name: '', color: '' };
  return {
    accountId: acc.id,
    appid: acc.appid || '',
    secret: acc.secret || '',
    author: acc.author || '固定地址',
    dryRun: Boolean(acc.dry_run),
    autoSubmit: Boolean(acc.auto_submit),
    name: acc.name || '',
    color: acc.color || ''
  };
}

async function getAccessToken(force = false, accountId = '') {
  const c = creds(accountId);
  if (!c.appid || !c.secret) throw new Error('未配置公众号 AppID / AppSecret');
  const cached = tokenCache.get(c.appid);
  if (!force && cached?.token && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch(`${API}/cgi-bin/stable_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credential', appid: c.appid, secret: c.secret, force_refresh: false }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json();
  if (!data.access_token) {
    if (data.errcode === 40164) throw new Error('40164：当前公网 IP 不在公众号 IP 白名单。把云服务器固定 EIP 加入白名单后重试。');
    throw new Error(`获取 access_token 失败：${data.errcode || ''} ${data.errmsg || JSON.stringify(data)}`);
  }
  tokenCache.set(c.appid, { token: data.access_token, expiresAt: Date.now() + (data.expires_in || 7200) * 1000 });
  return data.access_token;
}

function makeThumb(coverPath, outPath) {
  const attempts = [
    ['320', '320', '4'],
    ['280', '280', '6'],
    ['240', '240', '8']
  ];
  for (const [w, h, q] of attempts) {
    const r = spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', coverPath,
      '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0xF3EDE1`,
      '-q:v', q, outPath
    ], { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(outPath) && fs.statSync(outPath).size <= 60_000) return outPath;
  }
  throw new Error('封面缩略图无法压到 64KB 以内');
}

async function uploadArticleImage(file, token) {
  const form = new FormData();
  form.append('media', new Blob([fs.readFileSync(file)], { type: 'image/png' }), 'article.png');
  const res = await fetch(`${API}/cgi-bin/media/uploadimg?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!data.url) throw new Error(`上传文章图片失败：${data.errcode || ''} ${data.errmsg || JSON.stringify(data)}`);
  return data.url;
}

function ensureArticleAssets(render, spec, pubId) {
  const outDir = path.join(DATA_DIR, 'media', `article-${pubId}`);
  const inputDir = path.join(DATA_DIR, 'render-input');
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(inputDir, { recursive: true });
  const specFile = path.join(inputDir, `article-${pubId}.json`);
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));
  const script = path.join(ROOT, 'renderer', 'article-assets.mjs');
  const r = spawnSync(process.execPath, [script, '--spec', specFile, '--out', outDir], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('公众号配图生成失败：' + ((r.stderr || r.stdout || '').slice(-800)));
  const cover = path.join(outDir, 'article-cover.png');
  const figures = [1, 2, 3].map(i => path.join(outDir, `article-${i}.png`)).filter(fs.existsSync);
  if (!fs.existsSync(cover)) throw new Error('公众号封面没有生成');
  return { cover, figures, dir: outDir };
}

async function uploadThumb(thumbPath, token) {
  const form = new FormData();
  form.append('media', new Blob([fs.readFileSync(thumbPath)], { type: 'image/jpeg' }), 'thumb.jpg');
  const res = await fetch(`${API}/cgi-bin/material/add_material?access_token=${encodeURIComponent(token)}&type=thumb`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!data.media_id) throw new Error(`上传缩略图失败：${data.errcode || ''} ${data.errmsg || JSON.stringify(data)}`);
  return data.media_id;
}

async function addDraft(token, articles) {
  const list = Array.isArray(articles) ? articles : [articles];
  const res = await fetch(`${API}/cgi-bin/draft/add?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ articles: list }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!data.media_id) throw new Error(`新增草稿失败：${data.errcode || ''} ${data.errmsg || JSON.stringify(data)}`);
  return data.media_id;
}

async function submitPublish(token, mediaId) {
  const res = await fetch(`${API}/cgi-bin/freepublish/submit?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId }),
    signal: AbortSignal.timeout(30000)
  });
  const data = await res.json();
  if (!data.publish_id) throw new Error(`提交发布失败：${data.errcode || ''} ${data.errmsg || JSON.stringify(data)}`);
  return data.publish_id;
}

function articleHtml(brief, spec, images = [], opts = {}) {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const a = spec.article || {};
  const sections = Array.isArray(a.sections) ? a.sections : [];
  const sources = Array.isArray(a.sources) ? a.sources : [];
  const secondary = Boolean(opts.secondary);
  const series = a.series || {};
  const highlights = (a.highlights || []).map(x => String(x)).filter(Boolean).sort((x, y) => y.length - x.length);
  const hilite = (text) => {
    let s = esc(text);
    for (const word of highlights) {
      const w = esc(word);
      if (!w) continue;
      s = s.split(w).join(`<span style="background-color:#D9FF57;color:#101112;padding:1px 4px;border-radius:2px;">${w}</span>`);
    }
    return s;
  };
  const pStyle = `margin:0 0 18px;font-size:${secondary ? 15 : 16}px;line-height:1.9;color:#3A3A3A;letter-spacing:0;`;
  const paras = (text) => String(text || '').split(/\n{2,}/).map(p => `<p style="${pStyle}">${hilite(p).replace(/\n/g, '<br>')}</p>`).join('');
  const fig = (i, alt) => images[i] ? `<p style="margin:0;text-align:center;"><img src="${esc(images[i])}" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border-radius:8px;margin:20px 0 8px;"><span style="display:block;text-align:center;font-size:12px;color:#999;margin:0 0 22px;">${esc(alt)}</span></p>` : '';
  const sectionHead = (heading, i) => `<section style="margin:${secondary ? 28 : 38}px 0 14px;">
    <p style="margin:0 0 7px;font-size:11px;font-weight:700;letter-spacing:2px;color:#E5482C;">0${i + 1} / ${secondary ? '清单' : '拆解'}</p>
    <p style="margin:0;font-size:${secondary ? 19 : 22}px;line-height:1.5;font-weight:700;color:#101112;letter-spacing:0;">${esc(heading || '')}</p>
    <p style="margin:10px 0 0;border-top:1px solid #E7DED0;font-size:0;line-height:0;">&nbsp;</p>
  </section>`;
  const kicker = series.name
    ? `<p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;color:#E5482C;">${esc(series.name)} / ${esc(series.index || (secondary ? '02' : '01'))}${series.total ? ` OF ${esc(series.total)}` : ''}</p>`
    : '';
  const lead = a.lead
    ? `<section style="margin:0 0 26px;padding:18px 20px;background:#F3EDE1;border-left:4px solid #D9FF57;">
        <p style="margin:0;font-size:${secondary ? 19 : 22}px;line-height:1.65;font-weight:700;color:#101112;letter-spacing:0;">${hilite(a.lead)}</p>
      </section>`
    : '';
  const companion = secondary && a.companion_note
    ? `<p style="margin:0 0 18px;padding:10px 12px;background:#F7F7F4;border-radius:6px;font-size:13px;line-height:1.7;color:#777;">${esc(a.companion_note)}</p>`
    : '';
  const quote = a.quote
    ? `<section style="margin:26px 0;padding:14px 16px;border-left:3px solid #E5482C;background:#FAF7F1;">
        <p style="margin:0;font-size:17px;line-height:1.7;font-weight:700;color:#101112;">${hilite(a.quote)}</p>
      </section>`
    : '';
  const cta = a.cta
    ? `<section style="margin:30px 0;padding:18px 20px;background:#101112;border-radius:8px;">
        <p style="margin:0;font-size:16px;line-height:1.7;font-weight:700;color:#D9FF57;">${esc(a.cta)}</p>
      </section>`
    : '';

  const body = [];
  body.push(kicker);
  body.push(companion);
  body.push(lead);
  body.push(a.opening ? paras(a.opening) : '');
  if (secondary) {
    sections.forEach((s, i) => {
      body.push(sectionHead(s.heading, i));
      body.push(paras(s.body));
      if (i === 0) body.push(fig(0, s.heading || '清单'));
    });
  } else {
    body.push(fig(0, sections[0]?.heading || '类比'));
    sections.slice(0, 1).forEach((s, i) => { body.push(sectionHead(s.heading, i)); body.push(paras(s.body)); });
    body.push(fig(1, sections[1]?.heading || '对照'));
    sections.slice(1, 2).forEach((s, i) => { body.push(sectionHead(s.heading, i + 1)); body.push(paras(s.body)); });
    body.push(quote);
    body.push(fig(2, sections[2]?.heading || '行动'));
    sections.slice(2).forEach((s, i) => { body.push(sectionHead(s.heading, i + 2)); body.push(paras(s.body)); });
  }
  body.push(cta);
  if (!secondary) body.push(`<section style="margin:24px 0;padding:14px 16px;background:#F7F7F4;border-radius:8px;"><p style="margin:0;font-size:14px;line-height:1.7;color:#777;">完整视频见视频号。发布后把视频号链接补到本文“阅读原文”或留言区。</p></section>`);
  if (sources.length) {
    body.push(`<p style="margin:30px 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;color:#999;">参考来源</p>`);
    for (const s of sources) {
      body.push(`<p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:#999;letter-spacing:0;">${esc(s.title || '')}${s.url ? `：<a href="${esc(s.url)}" style="color:#576B95;text-decoration:none;">${esc(s.url)}</a>` : ''}</p>`);
    }
  }
  return body.filter(Boolean).join('');
}

export async function publishWechat(pub, { dryRun, accountId } = {}) {
  const c = creds(accountId || pub.account_id);
  const render = db.prepare('SELECT * FROM renders WHERE id=?').get(pub.render_id);
  if (!render) throw new Error('成片不存在');
  const brief = db.prepare('SELECT * FROM briefs WHERE id=?').get(render.brief_id);
  const specRow = db.prepare('SELECT * FROM specs WHERE id=?').get(render.spec_id);
  const spec = jsonParse(specRow?.spec_json, {});
  const isDry = dryRun === true || (dryRun !== false && c.dryRun);
  const steps = [];

  if (isDry) {
    steps.push({ step: 'validate_render', ok: Boolean(render.video_path), detail: render.video_path });
    steps.push({ step: 'validate_credentials', ok: Boolean(c.appid && c.secret), detail: c.appid ? `AppID 已配置，Secret 已配置（${c.name}）` : '未配置完整，正式发布会失败' });
    steps.push({ step: 'draft/add', ok: true, dry_run: true, detail: `将创建公众号图文草稿（账号：${c.name}，不会真的调用）` });
    if (c.autoSubmit) steps.push({ step: 'freepublish/submit', ok: true, dry_run: true, detail: '将提交发布（不会真的调用）' });
    db.prepare('UPDATE publications SET status=?, account_id=?, receipt_json=?, updated_at=? WHERE id=?')
      .run('dry_run', c.accountId, jsonString({ dry_run: true, account: { id: c.accountId, name: c.name }, steps, at: now() }), now(), pub.id);
    return { dry_run: true, steps, account: { id: c.accountId, name: c.name, color: c.color }, note: '这是 dry-run，没有调用微信接口。到设置里关闭 dry-run 才会正式创建草稿。' };
  }

  if (!c.appid || !c.secret) throw new Error('未配置公众号 AppID / AppSecret');
  const token = await getAccessToken(false, c.accountId);
  steps.push({ step: 'access_token', ok: true });

  const assets = ensureArticleAssets(render, spec, pub.id);
  steps.push({ step: 'article-assets', ok: true, cover: path.basename(assets.cover), figures: assets.figures.length });

  const imageUrls = [];
  for (const figure of assets.figures) {
    const url = await uploadArticleImage(figure, token);
    imageUrls.push(url);
    steps.push({ step: 'media/uploadimg', ok: true, file: path.basename(figure) });
  }

  const thumbAbs = path.join(DATA_DIR, 'media', `thumb-${pub.id}.jpg`);
  makeThumb(assets.cover, thumbAbs);
  const thumbMediaId = await uploadThumb(thumbAbs, token);
  steps.push({ step: 'material/add_material?type=thumb', ok: true, media_id: thumbMediaId });

  const article = spec.article || {};
  const title = String(article.title || brief.title || '固定地址').slice(0, 64);
  const digest = String(article.digest || `${spec.page1?.footnote || ''} ${spec.page2?.conclusion_highlight || ''}`).slice(0, 120);
  const articles = [{
    title,
    author: c.author,
    digest,
    content: articleHtml(brief, spec, imageUrls),
    content_source_url: '',
    thumb_media_id: thumbMediaId,
    need_open_comment: 1,
    only_fans_can_comment: 0
  }];
  if (article.secondary?.title) {
    const sec = article.secondary;
    articles.push({
      title: String(sec.title).slice(0, 64),
      author: c.author,
      digest: String(sec.digest || '').slice(0, 120),
      content: articleHtml(brief, { article: { ...sec, sources: sec.sources || [] } }, [imageUrls[2]].filter(Boolean), { secondary: true }),
      content_source_url: '',
      thumb_media_id: thumbMediaId,
      need_open_comment: 1,
      only_fans_can_comment: 0
    });
  }
  const mediaId = await addDraft(token, articles);
  steps.push({ step: 'draft/add', ok: true, media_id: mediaId, articles: articles.length });

  let publishId = '';
  if (c.autoSubmit) {
    publishId = await submitPublish(token, mediaId);
    steps.push({ step: 'freepublish/submit', ok: true, publish_id: publishId });
  }

  const status = publishId ? 'publishing' : 'draft_created';
  db.prepare('UPDATE publications SET status=?, account_id=?, external_id=?, receipt_json=?, updated_at=? WHERE id=?')
    .run(status, c.accountId, String(mediaId), jsonString({ account: { id: c.accountId, name: c.name }, steps, media_id: mediaId, publish_id: publishId, at: now() }), now(), pub.id);
  return { dry_run: false, status, media_id: mediaId, publish_id: publishId, steps, account: { id: c.accountId, name: c.name, color: c.color } };
}

export async function testWechat(accountId = '') {
  const c = creds(accountId);
  if (!c.appid || !c.secret) throw new Error('先填写 AppID 和 AppSecret');
  const token = await getAccessToken(true, c.accountId);
  return { ok: true, account: { id: c.accountId, name: c.name, color: c.color }, token_tail: token.slice(-6), note: '能拿到 access_token，说明 IP 白名单和凭据至少有一项是通的。' };
}
