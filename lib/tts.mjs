import fs from 'node:fs';
import path from 'node:path';
import { getSettings } from './db.mjs';

export const TTS_PROVIDERS = [
  { id: 'none', name: '未接入（字幕版）' },
  { id: 'volcano', name: '火山引擎 · 声音克隆' },
  { id: 'minimax', name: 'MiniMax' },
  { id: 'iflytek', name: '讯飞' },
  { id: 'siliconflow', name: '硅基流动' },
  { id: 'openai_compat', name: 'OpenAI 兼容' }
];

export function ttsConfig() {
  const s = getSettings();
  return {
    provider: s.tts_provider || 'none',
    base_url: s.tts_base_url || '',
    api_key: s.tts_api_key || '',
    model: s.tts_model || '',
    voice: s.tts_voice || '',
    speed: Number(s.tts_speed) || 1
  };
}

export function ttsConfigured() {
  const c = ttsConfig();
  return c.provider !== 'none' && Boolean(c.api_key) && Boolean(c.voice);
}

export async function synthesizeSpeech(text, outPath) {
  const c = ttsConfig();
  if (!c.api_key) throw new Error('未配置 TTS API Key');
  if (c.provider === 'openai_compat') {
    const url = (c.base_url || 'https://api.openai.com/v1').replace(/\/$/, '') + '/audio/speech';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${c.api_key}` },
      body: JSON.stringify({
        model: c.model || 'tts-1',
        input: String(text || '').slice(0, 4000),
        voice: c.voice || 'alloy',
        response_format: 'mp3',
        speed: c.speed
      }),
      signal: AbortSignal.timeout(60000)
    });
    if (!res.ok) throw new Error(`TTS 失败 ${res.status}: ${await res.text()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buf);
    return outPath;
  }
  throw new Error(`TTS 供应商 ${c.provider} 尚未实现，仅支持 OpenAI 兼容`);
}
