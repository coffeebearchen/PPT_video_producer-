from PIL import Image, ImageDraw, ImageFont
files=[f'designs/v3-engine-page-{i}.png' for i in range(1,5)]
w,h=560,443; gap=16; cols=2; W=w*2+gap*3; H=h*2+gap*3+40
b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b); f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
for i,p in enumerate(files):
 im=Image.open(p); im.thumbnail((w,h)); x=gap+(i%2)*(w+gap); y=gap+(i//2)*(h+gap)
 b.paste(im,(x,y)); d.text((x,y+h+6),['1 创作台','2 引擎差异','3 视频任务','4 设置'][i],font=f,fill='#f2efe8')
b.save('designs/v3-engine-board.jpg',quality=90); print('ok')
