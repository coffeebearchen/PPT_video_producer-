from PIL import Image, ImageDraw, ImageFont
for sys in ['system-b','system-c']:
 im=Image.open(f'designs/v2/{sys}-full.png'); print(sys,im.size)
 for i in range(5): im.crop((0,i*1920,1080,(i+1)*1920)).save(f'designs/v2/{sys}-{i+1}.png')
# build 3 system boards with 5 pages each
w,h=170,302; gap=18; W=w*5+gap*6; H=h+78
for sys,label in [('pages-v2','系统 A · Archive'),('system-b','系统 B · Terminal'),('system-c','系统 C · Editorial')]:
 files=[f'designs/v2/{sys}-page-{i}.png' for i in range(1,6)] if sys=='pages-v2' else [f'designs/v2/{sys}-{i}.png' for i in range(1,6)]
 b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b); f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
 for i,p in enumerate(files):
  im=Image.open(p); im.thumbnail((w,h)); x=gap+i*(w+gap); b.paste(im,(x,18))
  d.text((x,18+h+12),['封面','背景','对照','证据','金句'][i],font=f,fill='#f2efe8')
 b.save(f'designs/v2/{sys}-board.jpg',quality=92)
print('ok')
