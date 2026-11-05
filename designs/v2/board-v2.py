from PIL import Image, ImageDraw, ImageFont
files=[f'designs/v2/v2-page-{i}.png' for i in range(1,6)]
labels=['封面','背景','对照','证据','金句 / 结束']
w,h=200,356; gap=24; W=w*5+gap*6; H=h+90
b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b)
f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
for i,(p,l) in enumerate(zip(files,labels)):
 im=Image.open(p); im.thumbnail((w,h)); x=gap+i*(w+gap); b.paste(im,(x,20)); d.text((x,20+h+16),l,font=f,fill='#f2efe8')
b.save('designs/v2/pages-v2-board.jpg',quality=92); print('ok')
