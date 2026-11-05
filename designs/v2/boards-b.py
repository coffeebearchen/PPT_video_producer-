from PIL import Image, ImageDraw, ImageFont
for sys in ['system-b2','system-b3']:
 im=Image.open(f'designs/v2/{sys}-full.png')
 for i in range(5): im.crop((0,i*1920,1080,(i+1)*1920)).save(f'designs/v2/{sys}-{i+1}.png')
w,h=170,302; gap=18; W=w*5+gap*6; H=h+78
specs=[('system-b','B1 Phosphor',[f'designs/v2/system-b-{i}.png' for i in range(1,6)]),('system-b2','B2 Ultramarine',[f'designs/v2/system-b2-{i}.png' for i in range(1,6)]),('system-b3','B3 Orchid',[f'designs/v2/system-b3-{i}.png' for i in range(1,6)])]
for key,label,files in specs:
 b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b); f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',15)
 for i,p in enumerate(files):
  im=Image.open(p); im.thumbnail((w,h)); x=gap+i*(w+gap); b.paste(im,(x,18)); d.text((x,18+h+12),['封面','背景','对照','证据','金句'][i],font=f,fill='#f2efe8')
 b.save(f'designs/v2/{key}-board2.jpg',quality=92)
print('ok')
