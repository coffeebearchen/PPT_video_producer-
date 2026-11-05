from PIL import Image, ImageDraw, ImageFont
import os, subprocess

W,H,FPS,DUR=1080,1920,30,5
N=int(FPS*DUR)

def font(size, serif=False):
    return ImageFont.truetype('C:/Windows/Fonts/simsun.ttc' if serif else 'C:/Windows/Fonts/msyh.ttc', size)
F={'brand':font(24),'kicker':font(32),'setup':font(40),'turn':font(96,True),'sub':font(28),'concl':font(54),'small':font(24)}

def ease(p):
    p=max(0,min(1,p)); return 1-(1-p)**3

def text(base, xy, s, f, fill, alpha=1, anchor='mm'):
    if alpha<=0: return base
    layer=Image.new('RGBA',base.size,(0,0,0,0)); d=ImageDraw.Draw(layer)
    rgb=tuple(int(fill[i:i+2],16) for i in (1,3,5))
    d.text(xy,s,font=f,fill=rgb+(int(255*alpha),),anchor=anchor)
    return Image.alpha_composite(base,layer)

PALETTES={
 'b1': dict(bg='#070b09',white='#e9f4e6',muted='#9bb397',hl='#b6ff3b',danger='#ff6b3d',brand='#7f927d',mode='brush'),
 'b2': dict(bg='#07111f',white='#eaf2ff',muted='#9fb3d1',hl='#6ea8ff',danger='#ff4d6d',brand='#8397b8',mode='scan'),
 'b3': dict(bg='#0b0a12',white='#f2ecff',muted='#b4a9c9',hl='#d6a8ff',danger='#ff6b7a',brand='#8e86a8',mode='ink'),
}

def make(key,p):
    out=f'designs/v2/motion-{key}'; os.makedirs(out,exist_ok=True)
    bg=p['bg']; white=p['white']; muted=p['muted']; hl=p['hl']; danger=p['danger']; brand=p['brand']; mode=p['mode']
    for i in range(N):
        t=i/FPS; im=Image.new('RGBA',(W,H),bg); d=ImageDraw.Draw(im)
        d.line((108,90,108,140),fill=danger,width=6); d.text((132,104),'FIXED ADDRESS',font=F['brand'],fill=brand,anchor='lm')
        im=text(im,(540,300),'知识库 vs. RAG',F['kicker'],muted,ease((t-.15)/.35))
        # left enters
        lp=ease((t-.35)/.45); loff=(1-lp)*(40 if mode=='scan' else 30)
        im=text(im,(540+loff,480),'静态存储',F['setup'],muted,lp)
        im=text(im,(540+loff,560),'答案固定',F['turn'],white,lp)
        im=text(im,(540+loff,640),'更新慢',F['sub'],muted,lp)
        # x draw
        xp=ease((t-.95)/.5)
        if xp>0:
            d=ImageDraw.Draw(im); cx,cy=760,570; a=min(1,xp*2); b=max(0,min(1,(xp-.5)*2))
            d.line((cx-48,cy-48,cx-48+96*a,cy-48+96*a),fill=danger,width=16)
            d.line((cx+48,cy-48,cx+48-96*b,cy-48+96*b),fill=danger,width=16)
        # right enters
        rp=ease((t-.65)/.5); roff=(1-rp)*(44 if mode=='scan' else 34)
        im=text(im,(540+roff,840),'动态检索',F['setup'],muted,rp)
        # highlight modes
        hp=ease((t-1.55)/.65)
        X0,X1,Y0,Y1=330,750,895,990
        if hp>0:
            d=ImageDraw.Draw(im)
            right=X0+(X1-X0)*hp
            if mode in ('brush','scan'):
                d.rectangle((X0,Y0,right,Y1),fill=hl)
                if mode=='scan':
                    d.rectangle((max(X0,right-4),Y0-12,right,Y1+12),fill=white)
            else:
                # ink: underline grows first, then fill follows
                d.line((X0,Y1+6,right,Y1+6),fill=hl,width=6)
                if hp>.35:
                    d.rectangle((X0,Y0,X0+(X1-X0)*((hp-.35)/.65),Y1),fill=hl)
        dark = hp>=.99
        im=text(im,(540,920),'实时生成',F['turn'],('#071008' if key=='b1' and dark else ('#07111f' if key=='b2' and dark else ('#0b0a12' if dark else white))),rp)
        im=text(im,(540,1000),'跟资料走',F['sub'],muted,rp)
        # check draw
        yp=ease((t-1.25)/.5)
        if yp>0:
            d=ImageDraw.Draw(im)
            if yp<.5:
                q=yp/.5; d.line((800,900,800+40*q,900+45*q),fill=hl,width=18)
            else:
                q=(yp-.5)/.5; d.line((800,900,840,945),fill=hl,width=18); d.line((840,945,840+85*q,945-90*q),fill=hl,width=18)
        # conclusion
        cp=ease((t-2.25)/.55)
        im=text(im,(540,1360),'不是替代，是 协作',F['concl'],white,cp)
        if cp>0:
            d=ImageDraw.Draw(im); d.line((108,1290,972,1290),fill='#26332a' if key=='b1' else ('#1b3047' if key=='b2' else '#33263d'),width=2)
        im=text(im,(108,1800),'固定地址',F['small'],brand,1,'lm')
        im=text(im,(972,1800),'FIXED ADDRESS · CONTENT STUDIO',F['small'],brand,1,'rm')
        im.convert('RGB').save(f'{out}/frame_{i:04d}.jpg',quality=92)
    mp4=f'designs/v2/motion-{key}.mp4'
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate','30','-i',f'{out}/frame_%04d.jpg','-c:v','libx264','-pix_fmt','yuv420p','-crf','18',mp4],check=True)
    print(mp4)

for k,p in PALETTES.items(): make(k,p)
