from PIL import Image, ImageDraw, ImageFont
files=[f'designs/v2/page-{i}.png' for i in range(1,6)]
labels=['封面','背景','对照','证据','金句 / 结束']
w,h=200,356; gap=24; W=w*5+gap*6; H=h+90
b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b)
try: f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
except: f=ImageFont.load_default()
for i,(p,l) in enumerate(zip(files,labels)):
 im=Image.open(p); im.thumbnail((w,h)); x=gap+i*(w+gap); b.paste(im,(x,20));
 d.text((x,20+h+16),l,font=f,fill='#f2efe8')
b.save('designs/v2/pages-board.jpg',quality=92)

files=[f'designs/v2/ui-{i}.png' for i in range(1,4)]
labels=['Lite 生成','字段审核','批量生产']
tw=460; th=327; W=tw*3+gap*4; H=th+80
b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b)
for i,(p,l) in enumerate(zip(files,labels)):
 im=Image.open(p); im.thumbnail((tw,th)); x=gap+i*(tw+gap); b.paste(im,(x,20));
 d.text((x,20+th+14),l,font=f,fill='#f2efe8')
b.save('designs/v2/ui-board.jpg',quality=92)
print('ok')
