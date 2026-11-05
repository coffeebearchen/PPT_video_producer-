from PIL import Image, ImageDraw, ImageFont
files=[('designs/v2/motion-b1/frame_0120.jpg','B1 · Phosphor / Brush'),('designs/v2/motion-b2/frame_0120.jpg','B2 · Ultramarine / Scan'),('designs/v2/motion-b3/frame_0120.jpg','B3 · Orchid / Ink')]
w,h=300,533; gap=26; W=w*3+gap*4; H=h+80
b=Image.new('RGB',(W,H),'#111'); d=ImageDraw.Draw(b); f=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',20)
for i,(p,label) in enumerate(files):
 im=Image.open(p); im.thumbnail((w,h)); x=gap+i*(w+gap); b.paste(im,(x,20)); d.text((x,20+h+16),label,font=f,fill='#f2efe8')
b.save('designs/v2/motion-three-board.jpg',quality=92); print('ok')
