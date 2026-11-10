from PIL import Image
im=Image.open('designs/v3-engine-pages-full.png'); print(im.size)
for i in range(4): im.crop((0,i*980,1240,(i+1)*980)).save(f'designs/v3-engine-page-{i+1}.png')
