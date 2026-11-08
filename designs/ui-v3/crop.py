from PIL import Image
im=Image.open('designs/ui-v3/matrix-full.png'); print(im.size)
for i in range(3): im.crop((0,i*1100,1440,(i+1)*1100)).save(f'designs/ui-v3/screen-{i+1}.png')
