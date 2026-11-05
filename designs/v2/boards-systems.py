from PIL import Image, ImageDraw, ImageFont
specs=[('v2','系统 A · Archive',[f'designs/v2/v2-page-{i}.png' for i in range(1,6)]),('system-b','系统 B · Terminal',[f'designs/v2/system-b-{i}.png' for i in range(1,6)]),('system-c','系统 C · Editorial',[f'designs/v2/system-c-{i}.png' for i in range(1,6)])]
w,h=170,302; gap=18; W=w*5+gap*6; H=h+78
for key,label,files in specs:
 b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b); f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
 for i,p in enumerate(files):
  im=Image.open(p); im.thumbnail((w,h)); x=gap+i*(w+gap); b.paste(im,(x,18)); d.text((x,18+h+12),['封面','背景','对照','证据','金句'][i],font=f,fill='#f2efe8')
 b.save(f'designs/v2/{key}-board.jpg',quality=92)
print('ok')
