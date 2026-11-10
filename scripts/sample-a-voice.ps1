$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$renderer = Join-Path $taskRoot 'engines/vibemotion/renderer'
$voiceDir = Join-Path $renderer 'public/audio/sampleA'
New-Item -ItemType Directory -Force $voiceDir | Out-Null
$sentences = @(
 '一个想法听起来不错，并不代表它已经可靠。',
 '我们可以先提出方案，再运行一次，观察结果，然后决定怎么改。',
 '关键是，每一轮都留下记录。',
 '如果结果没有改善，不要只重复同一种做法。',
 '把原来的方案保留下来，分出两条不同的尝试，',
 '用相同的标准比较它们。',
 '有时，我们需要优化已有方案；有时，需要换一个方向。',
 '把每次改变与结果对应起来，下一步才有依据。',
 '最后留下的，不只是一份更好的方案，',
 '还有一条可以检查、可以继续的改进过程。'
)
$voice = New-Object -ComObject SAPI.SpVoice
$voice.Voice = $voice.GetVoices('Name=Microsoft Huihui Desktop').Item(0)
$voice.Rate = 1
for ($i=0; $i -lt $sentences.Count; $i++) {
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Open((Join-Path $voiceDir ("sentence-{0}.wav" -f $i)),3,$false)
  $voice.AudioOutputStream = $stream
  [void]$voice.Speak($sentences[$i])
  $stream.Close()
}
$sentences | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $voiceDir 'sentences.json')
Write-Output 'Generated 10 Chinese narration segments with Microsoft Huihui Desktop.'
