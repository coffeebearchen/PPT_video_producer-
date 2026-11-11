from PIL import Image
im=Image.open('designs/v4-series-full.png'); print(im.size)
W=im.width
for i in range(6): im.crop((0,i*920,W,(i+1)*920)).save(f'designs/v4-s{i+1}.png')
# board 2x3
import glob
files=['designs/v4-s1.png','designs/v4-s2.png','designs/v4-s3.png','designs/v4-s4.png','designs/v4-s5.png','designs/v4-s6.png']
w,h=700,447; gap=14; cols=2; W=gap+w*cols+gap*3; H=gap+h*3+gap*4
b=Image.new('RGB',(W,H),'#111')
for i,p in enumerate(files):
 im2=Image.open(p); im2.thumbnail((w,h)); x=gap+(i%cols)*(w+gap); y=gap+(i//cols)*(h+gap); b.paste(im2,(x,y))
b.save('designs/v4-board.jpg',quality=88); print('ok')
