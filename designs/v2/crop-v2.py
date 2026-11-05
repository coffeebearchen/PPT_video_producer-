from PIL import Image
im=Image.open('designs/v2/pages-v2-full.png'); print(im.size)
for i in range(5): im.crop((0,i*1920,1080,(i+1)*1920)).save(f'designs/v2/v2-page-{i+1}.png')
