
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const splitPoints = (text) => String(text || '').replace(/<[^>]*>/g,'').split(/[；;。]/).flatMap(x => x.split(/，/)).map(x => x.trim()).filter(Boolean).slice(0,3);
  let spec = null, pages = [], starts = [], duration = 24;
  const fitOneLine = (el, max, min) => {
    if (!el) return;
    el.style.whiteSpace = 'nowrap';
    let size = max;
    el.style.fontSize = size + 'px';
    let guard = 0;
    while (el.scrollWidth > el.parentElement.clientWidth && size > min && guard++ < 80) {
      size -= 1; el.style.fontSize = size + 'px';
    }
  };

  window.renderV2 = function(s) {
    spec = s;
    const n = Number(s.page_count) || 5;
    document.body.dataset.palette = s.palette || 'b1';
    const p = s.page1 || {}, c = s.context || {}, p2 = s.page2 || {}, p3 = s.evidence || s.page3 || {}, q = s.quote || {}, o = s.objection || {};
    $('#pg-cover .cover-lead').textContent = p.cover?.lead || '';
    $('#pg-cover .cover-punch').innerHTML = '<span class="brush">' + esc(p.cover?.punch || '') + '</span>';
    $('#pg-context .title').textContent = c.title || '';
    ['scene','roles','constraint'].forEach(k => { const el = document.querySelector(`#pg-context [data-k="${k}"]`); if (el) el.textContent = c[k] || ''; });
    $('#pg-compare .kicker').textContent = p2.kicker || ((p2.left_tag || '') + ' vs. ' + (p2.right_tag || ''));
    const leftSetup = p2.left_thin || p2.left_line1_rest || '看起来是';
    const leftTurn = p2.left_thin ? p2.left_line1_rest : p2.left_line2;
    const leftSub = p2.left_thin ? p2.left_line2 : (p2.left_stamp || '');
    $('#pg-compare .left .setup').textContent = leftSetup;
    $('#pg-compare .left .turn').textContent = leftTurn || '';
    $('#pg-compare .left .sub').textContent = leftSub || '';
    $('#pg-compare .right .setup').textContent = p2.right_prefix || '其实是';
    $('#pg-compare .right .turn').textContent = p2.right_highlight || '';
    $('#pg-compare .right .sub').textContent = p2.right_badge || '';
    $('#pg-compare .conclusion').innerHTML = esc(p2.conclusion_prefix || '') + ' <b>' + esc(p2.conclusion_highlight || '') + '</b>';
    $('#pg-evidence .title').textContent = p3.title || '';
    const pts = splitPoints(p3.note || '');
    $('#pg-evidence .points').innerHTML = pts.map((x,i) => `<div class="point${i===1?' hl':''}">${esc(x)}</div>`).join('');
    $('#pg-evidence .bottom-note').textContent = p3.bottom || '';
    $('#pg-quote .quote-line1').textContent = q.line1 || '';
    $('#pg-quote .quote-line2').textContent = q.line2 || '';
    $('#pg-quote .quote-note').textContent = q.note || '';
    $('#pg-objection .title').textContent = o.title || '';
    $('#pg-objection .obj-note').textContent = o.note || '';
    $('#pg-objection .obj-bottom').textContent = o.bottom || '';

    const order = n === 4 ? ['pg-cover','pg-context','pg-compare','pg-quote'] : (n === 5 ? ['pg-cover','pg-context','pg-compare','pg-evidence','pg-quote'] : ['pg-cover','pg-context','pg-objection','pg-compare','pg-evidence','pg-quote']);
    const track = $('#track');
    order.forEach(id => track.appendChild(document.getElementById(id)));
    document.querySelectorAll('.page').forEach(el => { if (!order.includes(el.id)) el.classList.add('hidden'); });
    starts = n === 4 ? [0,5.15,10.15,17.15] : (n === 5 ? [0,5.15,10.15,16.15,21.15] : [0,5.15,10.15,14.15,20.15,25.15]);
    duration = n === 6 ? 28 : (n === 5 ? 24 : 20);
    track.style.width = (n * 1080) + 'px';
    pages = order.map(id => document.getElementById(id));
    document.querySelectorAll('.mark path').forEach(path => { const len=path.getTotalLength(); path.style.strokeDasharray=String(len); path.style.strokeDashoffset=String(len); });
    window.DURATION = duration;
    requestAnimationFrame(() => {
      fitOneLine(document.querySelector('#pg-cover .cover-lead'), 58, 44);
      fitOneLine(document.querySelector('#pg-cover .cover-punch'), 104, 72);
      fitOneLine(document.querySelector('#pg-context .title'), 78, 54);
      fitOneLine(document.querySelector('#pg-compare .left .turn'), 94, 60);
      fitOneLine(document.querySelector('#pg-compare .right .turn'), 94, 60);
      fitOneLine(document.querySelector('#pg-evidence .title'), 78, 54);
      fitOneLine(document.querySelector('#pg-quote .quote-line1'), 72, 52);
      fitOneLine(document.querySelector('#pg-quote .quote-line2'), 88, 60);
    });
    window.renderAt(0);
  };

  window.renderAt = function(t) {
    if (!spec) return;
    let idx = 0;
    for (let i=0;i<starts.length;i++) if (t >= starts[i]) idx = i;
    const x = -idx * 1080;
    document.getElementById('track').style.transform = `translateX(${x}px)`;
    const local = t - starts[idx];
    const pg = pages[idx];
    if (!pg) return;
    const p = spec.page1 || {};
    const p2 = spec.page2 || {};
    const p3 = spec.evidence || spec.page3 || {};
    const q = spec.quote || {};
    // all hidden-ish default
    const a = (sel, alpha, y=0) => { const e = pg.querySelector(sel); if (!e) return; e.style.opacity = alpha; e.style.transform = `translateY(${y}px)`; };
    if (pg.id === 'pg-cover') {
      a('.cover-lead', 1, 0);
      const enter = Math.min(1, Math.max(0, (local-.55)/.55));
      const punch = pg.querySelector('.cover-punch');
      punch.style.opacity = enter;
      punch.style.transform = `translateX(${(1-enter)*90}px)`;
      const brush = Math.min(1, Math.max(0, (local-2.1)/.6));
      const b = pg.querySelector('.brush');
      if (b) b.style.clipPath = `inset(0 ${100-brush*100}% 0 0)`;
    } else if (pg.id === 'pg-context') {
      pg.querySelectorAll('.ctx-row').forEach((e,i)=>{ const p=Math.min(1,Math.max(0,(local-.3-i*.22)/.45)); e.style.opacity=p; e.style.transform=`translateY(${(1-p)*24}px)`; });
    } else if (pg.id === 'pg-compare') {
      const l = Math.min(1,Math.max(0,(local-.3)/.45)); const r = Math.min(1,Math.max(0,(local-.75)/.45));
      pg.querySelector('.left').style.opacity=l; pg.querySelector('.left').style.transform=`translateY(${(1-l)*26}px)`;
      pg.querySelector('.right').style.opacity=r; pg.querySelector('.right').style.transform=`translateY(${(1-r)*26}px)`;
      const h = Math.min(1,Math.max(0,(local-1.55)/.6));
      const hl = pg.querySelector('.right .turn'); if (hl) hl.style.backgroundSize = `${h*100}% 100%`;
      const conc = pg.querySelector('.conclusion'); if (conc) { const c=Math.min(1,Math.max(0,(local-2.25)/.5)); conc.style.opacity=c; }
    } else if (pg.id === 'pg-evidence') {
      pg.querySelectorAll('.point').forEach((e,i)=>{ const p=Math.min(1,Math.max(0,(local-.35-i*.25)/.5)); e.style.opacity=p; e.style.transform=`translateY(${(1-p)*24}px)`; });
      const bn=pg.querySelector('.bottom-note'); if (bn) bn.style.opacity=Math.min(1,Math.max(0,(local-2)/.5));
    } else if (pg.id === 'pg-quote') {
      const l1=Math.min(1,Math.max(0,(local-.35)/.5)); const l2=Math.min(1,Math.max(0,(local-.8)/.5));
      pg.querySelector('.quote-line1').style.opacity=l1; pg.querySelector('.quote-line2').style.opacity=l2;
      pg.querySelector('.quote-note').style.opacity=Math.min(1,Math.max(0,(local-1.5)/.5));
      const ask=pg.querySelector('.ask'); if (ask) ask.style.opacity=Math.min(1,Math.max(0,(local-1.8)/.5));
    }
  };
  window.v2Check = function() {
    const issues = [];
    const safe = { left: 108, right: 972, top: 192, bottom: 1728 };
    document.querySelectorAll('.page:not(.hidden) .safe *').forEach(el => {
      if (!el.textContent || !el.textContent.trim()) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.left < safe.left - 4 || r.right > safe.right + 4 || r.top < safe.top - 4 || r.bottom > safe.bottom + 4) {
        issues.push({ id: el.className || el.id, text: el.textContent.trim().slice(0, 20), reason: '超出 80% 安全区' });
      }
    });
    return issues;
  };
  window.setDuration = v => { duration = Number(v)||duration; window.DURATION=duration; };
})();
