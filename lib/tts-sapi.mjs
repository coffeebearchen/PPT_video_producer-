// SAPI 受控适配器：把 Windows 本地语音（SAPI.SpVoice）包成平台可调的固定接口。
// 不联网、无 Key、本地免费；输出 WAV。作为 lib/tts.mjs 的一个 provider 使用。
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_VOICE = 'Microsoft Huihui Desktop';

// PowerShell 单引号字符串转义
const ps = (s) => String(s).replace(/'/g, "''");

export function synthesizeSapi(text, outPath, opts = {}) {
  const voiceName = String(opts.voice || DEFAULT_VOICE);
  const rate = Number.isFinite(Number(opts.rate)) ? Number(opts.rate) : 2;
  const out = path.resolve(outPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmpText = out + '.src.txt';
  fs.writeFileSync(tmpText, String(text || ''), 'utf8');

  const script = [
    '$ErrorActionPreference = "Stop"',
    '$voice = New-Object -ComObject SAPI.SpVoice',
    `$voices = $voice.GetVoices('Name=${ps(voiceName)}')`,
    'if ($voices.Count -eq 0) { $voices = $voice.GetVoices() }',
    'if ($voices.Count -eq 0) { throw "SAPI: no voice available" }',
    '$voice.Voice = $voices.Item(0)',
    `$voice.Rate = ${rate}`,
    '$stream = New-Object -ComObject SAPI.SpFileStream',
    `$stream.Open('${ps(out)}', 3, $false)`,
    'try {',
    '  $voice.AudioOutputStream = $stream',
    `  [void]$voice.Speak((Get-Content -LiteralPath '${ps(tmpText)}' -Raw))`,
    '} finally { $stream.Close() }',
    `Remove-Item -LiteralPath '${ps(tmpText)}' -Force -ErrorAction SilentlyContinue`
  ].join('\n');

  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true });
  try { fs.rmSync(tmpText, { force: true }); } catch {}
  if (r.status !== 0) throw new Error('SAPI 合成失败：' + String(r.stderr || r.stdout || '').slice(-400));
  if (!fs.existsSync(out) || fs.statSync(out).size === 0) throw new Error('SAPI 未生成音频文件');
  return out;
}

// 列出可用 SAPI 声音（名称），供设置页/调试用。
export function listSapiVoices() {
  const script = [
    '$voice = New-Object -ComObject SAPI.SpVoice',
    '$voices = $voice.GetVoices()',
    'for ($i = 0; $i -lt $voices.Count; $i++) { $voices.Item($i).GetDescription() }'
  ].join('\n');
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) return [];
  return String(r.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}
