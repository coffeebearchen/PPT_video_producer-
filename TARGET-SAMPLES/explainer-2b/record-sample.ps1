$ErrorActionPreference = 'Stop'
$sample = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'script.json') -Encoding UTF8 -Raw | ConvertFrom-Json
$sentences = @($sample.script -split '\r?\n' | Where-Object { $_.Trim() })
$outDir = Join-Path $PSScriptRoot 'out'
$partsDir = Join-Path $outDir 'voice-parts'
$audioDir = Join-Path $outDir 'public\audio'
New-Item -ItemType Directory -Force -Path $partsDir, $audioDir | Out-Null

$voice = New-Object -ComObject SAPI.SpVoice
$voices = $voice.GetVoices('Name=Microsoft Huihui Desktop')
if ($voices.Count -eq 0) { throw 'Microsoft Huihui Desktop is required for this local sample.' }
$voice.Voice = $voices.Item(0)
$voice.Rate = 2

$cursor = 0
$cues = @()
$concat = @()
for ($index = 0; $index -lt $sentences.Count; $index++) {
  $raw = Join-Path $partsDir "raw-$index.wav"
  $padded = Join-Path $partsDir "part-$index.wav"
  $stream = New-Object -ComObject SAPI.SpFileStream
  $stream.Open($raw, 3, $false)
  try {
    $voice.AudioOutputStream = $stream
    [void]$voice.Speak($sentences[$index])
  } finally {
    $stream.Close()
  }

  $duration = & ffprobe -v error -show_entries format=duration -of csv=p=0 $raw
  if ($LASTEXITCODE -ne 0) { throw "Could not read duration of sentence $index." }
  $voiceMs = [math]::Round([double]::Parse($duration, [Globalization.CultureInfo]::InvariantCulture) * 1000)
  $cues += @{ text = $sentences[$index]; startMs = $cursor; endMs = $cursor + $voiceMs }
  & ffmpeg -nostdin -hide_banner -loglevel error -y -i $raw -af apad=pad_dur=0.15 -c:a pcm_s16le $padded
  if ($LASTEXITCODE -ne 0) { throw "Could not pad sentence $index." }
  $concat += "file 'part-$index.wav'"
  $cursor += $voiceMs + 150
}

$utf8 = [Text.UTF8Encoding]::new($false)
$concatPath = Join-Path $partsDir 'concat.txt'
[IO.File]::WriteAllLines($concatPath, [string[]]$concat, $utf8)
$voicePath = Join-Path $audioDir 'narration.wav'
& ffmpeg -nostdin -hide_banner -loglevel error -y -f concat -safe 0 -i $concatPath -c:a pcm_s16le $voicePath
if ($LASTEXITCODE -ne 0) { throw 'Could not join narration.' }
$total = & ffprobe -v error -show_entries format=duration -of csv=p=0 $voicePath
if ($LASTEXITCODE -ne 0) { throw 'Could not read narration duration.' }
$durationMs = [math]::Ceiling([double]::Parse($total, [Globalization.CultureInfo]::InvariantCulture) * 30) * 1000 / 30
$input = @{ title = $sample.title; script = $sample.script; style = $sample.style; cues = $cues; durationMs = [math]::Round($durationMs); voiceSrc = 'audio/narration.wav' }
[IO.File]::WriteAllText((Join-Path $outDir 'narration-input.json'), ($input | ConvertTo-Json -Depth 6), $utf8)
Write-Output "Narration: $($cues.Count) measured sentences, $([math]::Round($durationMs)) ms."
