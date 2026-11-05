import json
import os
import subprocess
import sys
from PIL import Image

video = sys.argv[1] if len(sys.argv) > 1 else 'out/editorial-red-clean2.mp4'
times = [float(x) for x in (sys.argv[2].split(',') if len(sys.argv) > 2 else ['5.8', '11.8', '17.8'])]
out_dir = 'out/transition-check'
os.makedirs(out_dir, exist_ok=True)
rows = []
for t in times:
    frame = os.path.join(out_dir, f'{t:.1f}.png')
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-ss', str(t), '-i', video, '-frames:v', '1', frame], check=True)
    im = Image.open(frame).convert('RGB')
    w, h = im.size
    band = max(2, int(w * 0.02))
    def mean_region(x0, x1):
        px = im.crop((x0, 0, x1, h)).resize((1, 1)).getpixel((0, 0))
        return sum(px) / 3
    left = mean_region(0, band)
    right = mean_region(w - band, w)
    center = mean_region(int(w * .4), int(w * .6))
    flags = []
    if left < 20 and center > 60: flags.append('left dark edge')
    if right < 20 and center > 60: flags.append('right dark edge')
    rows.append({'time': t, 'frame': frame, 'left': round(left, 1), 'right': round(right, 1), 'center': round(center, 1), 'flags': flags})
report = {'video': video, 'rows': rows, 'flagged': sum(1 for r in rows if r['flags'])}
print(json.dumps(report, ensure_ascii=False, indent=2))
