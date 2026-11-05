from PIL import Image
im=Image.open('designs/v2/ui-full.png'); print(im.size)
for i in range(3): im.crop((0,i*1024,1440,(i+1)*1024)).save(f'designs/v2/ui-{i+1}.png')
