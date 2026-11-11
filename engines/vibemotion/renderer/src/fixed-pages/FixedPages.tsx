import React, {useLayoutEffect, useRef} from 'react';
import {
  AbsoluteFill, Audio, Easing, Sequence, cancelRender, interpolate,
  staticFile, useCurrentFrame, useDelayRender, useVideoConfig,
} from 'remotion';
import {FINAL_ASK, HEIGHT, WIDTH, pageFrames, type FixedPageProps} from './project';

const heading = 'ZCOOL KuaiLe';
const body = 'LXGW WenKai';
const paper = '#F3EDE1';
const ink = '#20201D';
const vermilion = '#A63423';
const lime = '#CDE882';
const mutedPaper = '#5F594E';
const mutedNight = '#C8C8B9';
const titleStyle: React.CSSProperties = {fontFamily: heading, fontWeight: 400, margin: 0, lineHeight: 1.12};
const row: React.CSSProperties = {display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18};
const stack: React.CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'center'};

function Copy({children, size = 36, minimum = 24, style}: {
  children: React.ReactNode; size?: number; minimum?: number; style?: React.CSSProperties;
}) {
  return <div data-min-font={minimum} style={{fontSize: size, lineHeight: 1.42, maxWidth: '100%', overflowWrap: 'anywhere', ...style}}>{children}</div>;
}

function Mark({children, progress = 1}: {children: string; progress?: number}) {
  return <span style={{paddingInline: 12, color: 'inherit', backgroundImage: 'linear-gradient(#CDE882,#CDE882)', backgroundPosition: 'left 83%', backgroundSize: `${progress * 100}% 0.7em`, backgroundRepeat: 'no-repeat'}}>{children}</span>;
}

function Brand({name, dark}: {name: string; dark: boolean}) {
  return <div style={{...row, width: '100%', justifyContent: 'space-between'}}>
    <Copy size={24} style={{letterSpacing: 3, color: dark ? mutedNight : mutedPaper}}>{name}</Copy>
    <div aria-hidden style={{width: 58, height: 2, background: dark ? lime : vermilion}} />
  </div>;
}

function Audit({surface, name, cover}: {surface: React.RefObject<HTMLDivElement | null>; name: string; cover: boolean}) {
  const {delayRender, continueRender} = useDelayRender();
  useLayoutEffect(() => {
    const handle = delayRender(`Audit ${name}`);
    let active = true;
    void document.fonts.ready.then(() => {
      const root = surface.current;
      if (!active || !root) return;
      const canvas = root.getBoundingClientRect();
      const left = canvas.left + canvas.width * 0.1;
      const right = canvas.right - canvas.width * 0.1;
      const top = canvas.top + canvas.height * 0.1;
      const bottom = canvas.bottom - canvas.height * 0.1;
      const inside = (rect: DOMRect) => rect.left >= left - 0.5 && rect.right <= right + 0.5 && rect.top >= top - 0.5 && rect.bottom <= bottom + 0.5;
      const forbidden = /^(?:背景|证据|反例|金句|结构对照|CONTEXT)(?:$|\s*[/｜|：])|^0[1-5]\s*[/｜|]|先把背景说清楚|先把场景、角色和限制讲清楚|背景不是铺垫/;
      const issues: string[] = [];
      const checked = [...root.querySelectorAll<HTMLElement>('[data-min-font]')].map((element) => {
        const value = element.innerText.trim();
        const fontSize = parseFloat(getComputedStyle(element).fontSize);
        const range = document.createRange();
        range.selectNodeContents(element);
        const rectangles = [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
        if (fontSize < Number(element.dataset.minFont)) issues.push(`字号 ${fontSize}px：${value}`);
        if (!rectangles.every(inside)) issues.push(`文字超出安全区：${value}`);
        if (forbidden.test(value)) issues.push(`内部标签：${value}`);
        return {text: value, fontSize};
      });
      for (const box of root.querySelectorAll<HTMLElement>('[data-audit-box]')) {
        if (!inside(box.getBoundingClientRect())) issues.push(`构图超出安全区：${box.dataset.auditBox}`);
      }
      const ask = root.querySelector<HTMLElement>('[data-final-ask]');
      const askBounds = ask?.getBoundingClientRect();
      if (name === 'quote' && (!ask || ask.innerText !== FINAL_ASK || !askBounds || !inside(askBounds)
        || askBounds.left < canvas.left + canvas.width / 2 || askBounds.bottom < canvas.top + canvas.height * 0.84)) {
        issues.push('末页 CTA 须位于安全区右下角');
      }
      if (name !== 'quote' && ask) issues.push('CTA 只能出现在末页');
      console.info(`FIXED_PAGE_AUDIT ${JSON.stringify({page: name, cover, checked, issues})}`);
      if (issues.length) cancelRender(new Error(issues.join('\n')));
      else continueRender(handle);
    }).catch(cancelRender);
    return () => {
      active = false;
      continueRender(handle);
    };
  }, [cover, name, surface, delayRender, continueRender]);
  return null;
}

function PaperIndex() {
  return <svg aria-hidden width={570} height={400} viewBox="0 0 570 400" style={{display: 'block'}}>
    <defs><pattern id="index-hatch" width="9" height="9" patternTransform="rotate(40)" patternUnits="userSpaceOnUse"><path d="M0 0V9" stroke="#A88668" opacity=".25" /></pattern></defs>
    <path d="M73 327C156 365 403 365 504 311" fill="none" stroke="#D5C3A8" strokeWidth="1.5" strokeDasharray="5 8" />
    <rect x="135" y="84" width="300" height="186" rx="19" fill="url(#index-hatch)" stroke="#AF9A83" strokeWidth="2" transform="rotate(-10 285 177)" />
    <rect x="132" y="100" width="300" height="186" rx="19" fill="#E4D6C1" stroke="#AF9A83" strokeWidth="2" transform="rotate(8 282 193)" />
    <rect x="124" y="115" width="322" height="191" rx="19" fill="#FCF8ED" stroke="#846F57" strokeWidth="2" />
    <path d="M164 170H350M164 201H314M164 232H277" stroke="#BDB3A0" strokeWidth="4" strokeLinecap="round" />
    <path d="M325 248C375 249 396 221 397 182M382 198L397 180 412 196" fill="none" stroke="#A63423" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="325" cy="248" r="5" fill="#A63423" />
  </svg>;
}

type PageName = 'cover' | 'context' | 'compare' | 'quote';

function FixedPage({spec, name, audit = false, cover = false}: FixedPageProps & {name: PageName; cover?: boolean}) {
  const local = useCurrentFrame();
  const {fps, height} = useVideoConfig();
  const surface = useRef<HTMLDivElement>(null);
  const dark = name === 'compare' || name === 'quote';
  const emphasis = cover ? 1 : interpolate(local, [0.38 * fps, 1.08 * fps], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
  });
  const p1 = spec.page1;
  const p2 = spec.page2;
  const q = spec.quote;
  const leftSetup = p2.left_thin || p2.left_line1_rest;
  const leftAnswer = p2.left_thin ? p2.left_line1_rest : p2.left_line2;
  const leftNote = p2.left_thin ? p2.left_line2 : p2.left_stamp;
  const lines = p1.cover?.lead ? [p1.cover.lead] : p1.lines;
  const punch = p1.cover?.punch || p1.highlight;
  const quoteParts = q.highlight ? q.line2.split(q.highlight) : [q.line2];
  const highlightQuote = quoteParts.length === 2;

  return <AbsoluteFill ref={surface} style={{background: dark ? '#171B18' : paper, color: dark ? '#FAF3DC' : ink, fontFamily: body, textAlign: 'center'}}>
    <AbsoluteFill aria-hidden style={{
      backgroundImage: dark
        ? 'radial-gradient(ellipse at 75% 25%, #35402F 0%, transparent 57%), repeating-linear-gradient(0deg, #FFFFFF06 0 1px, transparent 1px 5px)'
        : 'radial-gradient(ellipse at 76% 75%, #E8D9C2 0%, transparent 70%), repeating-linear-gradient(90deg, #53352209 0 1px, transparent 1px 54px), repeating-linear-gradient(0deg, #53352209 0 1px, transparent 1px 54px)',
      pointerEvents: 'none',
    }} />
    <div style={{position: 'absolute', inset: `${height * 0.1 + 12}px 120px`, ...stack}}>
      <Brand name={spec.brand} dark={dark} />
      {name === 'cover' && <div style={{...stack, flex: 1, width: '100%', justifyContent: 'center', gap: 40}}>
        <Copy size={33} style={{color: vermilion, letterSpacing: 2}}>{p1.kicker}{p1.kicker_accent}</Copy>
        <div style={{...stack, gap: 19, width: '100%'}}>
          {lines.map((line, index) => <Copy key={index} size={76} style={titleStyle}>{line}</Copy>)}
          <Copy size={100} style={titleStyle}><Mark progress={emphasis}>{punch}</Mark></Copy>
        </div>
        <div aria-hidden style={{height: 2, width: 122, background: vermilion, opacity: 0.5}} />
        <Copy size={34} minimum={28} style={{color: mutedPaper}}>{p1.footnote}</Copy>
        {p1.en && <Copy size={24} style={{color: mutedPaper, letterSpacing: 4}}>{p1.en}</Copy>}
      </div>}
      {name === 'context' && <div style={{...stack, flex: 1, width: '100%', justifyContent: 'center', gap: 44}}>
        {spec.context.subtitle && <Copy size={30} minimum={28} style={{color: vermilion}}>{spec.context.subtitle}</Copy>}
        <Copy size={70} style={{...titleStyle, maxWidth: 780}}>{spec.context.title}</Copy>
        <Copy size={37} minimum={28} style={{maxWidth: 740, color: mutedPaper}}>{spec.context.note}</Copy>
        <div data-audit-box="index card"><PaperIndex /></div>
        <Copy size={38} style={{color: vermilion, opacity: 0.5 + 0.5 * emphasis}}>{spec.context.bottom}</Copy>
      </div>}
      {name === 'compare' && <div style={{...stack, flex: 1, width: '100%', justifyContent: 'center', gap: 52}}>
        <Copy size={44} style={{...titleStyle, lineHeight: 1.25}}>{p2.kicker}<br /><span style={{color: lime}}>{p2.kicker_accent}</span></Copy>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, width: '100%'}}>
          <div data-audit-box="left comparison" style={{...stack, border: '1px solid #7A7964', borderRadius: 22, padding: '42px 14px', gap: 17, background: '#272C26', justifyContent: 'center'}}>
            <Copy size={28} style={{color: mutedNight}}>{p2.left_tag}</Copy>
            <Copy size={31}>{leftSetup}</Copy>
            <Copy size={46} style={titleStyle}>{leftAnswer}</Copy>
            <div style={row}>
              <svg aria-hidden width={37} height={37} viewBox="0 0 40 40"><path d="m9 9 22 22M31 9 9 31" stroke="#F19B85" strokeWidth="4" strokeLinecap="round" /></svg>
              {leftNote && <Copy size={28} style={{color: '#F19B85'}}>{leftNote}</Copy>}
            </div>
          </div>
          <div data-audit-box="right comparison" style={{...stack, border: '1px solid #91A66C', borderRadius: 22, padding: '42px 14px', gap: 17, background: '#313C2B', justifyContent: 'center'}}>
            <Copy size={28} style={{color: mutedNight}}>{p2.right_tag}</Copy>
            <Copy size={31}>{p2.right_prefix}</Copy>
            <Copy size={52} style={{...titleStyle, color: lime}}>{p2.right_highlight}</Copy>
            <div style={row}>
              <svg aria-hidden width={37} height={37} viewBox="0 0 40 40"><path d="m8 21 8 8L33 11" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - emphasis} fill="none" stroke={lime} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {p2.right_badge && <Copy size={28} style={{color: lime}}>{p2.right_badge}</Copy>}
            </div>
          </div>
        </div>
        <div style={{...stack, gap: 14}}>
          {p2.conclusion_small && <Copy size={27} style={{color: mutedNight}}>{p2.conclusion_small}</Copy>}
          <Copy size={61} style={titleStyle}>{p2.conclusion_prefix}<span style={{color: lime}}>{p2.conclusion_highlight}</span></Copy>
        </div>
        <Copy size={33} minimum={28} style={{maxWidth: 720, color: mutedNight}}>{p2.footnote}</Copy>
      </div>}
      {name === 'quote' && <>
        <div style={{...stack, flex: 1, width: '100%', justifyContent: 'center', gap: 42}}>
          <svg aria-hidden width={64} height={44} viewBox="0 0 64 44"><path d="M4 38C4 16 13 8 25 5M34 38C34 16 43 8 55 5" fill="none" stroke="#A2B08A" strokeWidth="4" strokeLinecap="round" /></svg>
          <div style={{...stack, gap: 17}}>
            <Copy size={66} style={titleStyle}>{q.line1}</Copy>
            <Copy size={79} style={titleStyle}>
              {highlightQuote ? <>{quoteParts[0]}<span style={{color: lime, backgroundImage: 'linear-gradient(#CDE882,#CDE882)', backgroundSize: `${emphasis * 100}% 2px`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left bottom'}}>{q.highlight}</span>{quoteParts[1]}</> : q.line2}
            </Copy>
          </div>
          <Copy size={38} minimum={28} style={{color: mutedNight}}>{q.note}</Copy>
          {q.stamp && <div data-audit-box="quote stamp" style={{border: '1px solid #CC846E', borderRadius: 25, padding: '7px 22px'}}><Copy size={24} style={{color: '#F19B85'}}>{q.stamp}</Copy></div>}
        </div>
        <div data-final-ask style={{alignSelf: 'flex-end', color: mutedNight}}><Copy size={28}>{FINAL_ASK}</Copy></div>
      </>}
    </div>
    {audit && <Audit surface={surface} name={name} cover={cover} />}
  </AbsoluteFill>;
}

export function FixedPages(props: FixedPageProps) {
  const {fps} = useVideoConfig();
  const cuts = pageFrames(fps, props.durationSeconds ?? 20);
  const names: PageName[] = ['cover', 'context', 'compare', 'quote'];
  return <AbsoluteFill style={{width: WIDTH, height: HEIGHT}}>
    {names.map((name, index) => <Sequence key={name} name={name} from={cuts[index]} durationInFrames={cuts[index + 1] - cuts[index]}>
      <FixedPage {...props} name={name} />
    </Sequence>)}
    {props.spec.music === 'pulse' && <>
      <Audio src={staticFile('audio/music-pulse.wav')} loop volume={0.26} />
      {cuts.slice(1, 4).map((from) => <Sequence key={from} from={from} durationInFrames={Math.round(0.65 * fps)}>
        <Audio src={staticFile('audio/whoosh.wav')} volume={0.08} />
      </Sequence>)}
    </>}
  </AbsoluteFill>;
}

export function FixedPagesCover(props: FixedPageProps) {
  return <FixedPage {...props} name="cover" cover />;
}
