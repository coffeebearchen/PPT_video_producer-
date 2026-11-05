from PIL import Image, ImageDraw, ImageFont
import os, subprocess, math

W,H,FPS,DUR=1080,1920,30,5
N=int(FPS*DUR)
BG='#070b09'; WHITE='#e9f4e6'; MUTED='#9bb397'; LIME='#b6ff3b'; DANGER='#ff6b3d'; BRAND='#7f927d'
def font(size,serif=False): return ImageFont.truetype('C:/Windows/Fonts/simsun.ttc' if serif else 'C:/Windows/Fonts/msyh.ttc',size)
F={'brand':font(24),'kicker':font(32),'setup':font(40),'turn':font(96,True),'sub':font(28),'concl':font(54),'small':font(24)}
def ease(p): p=max(0,min(1,p)); return 1-(1-p)**3
def text(base,xy,s,f,fill,alpha=1,anchor='mm'):
    if alpha<=0:return base
    layer=Image.new('RGBA',base.size,(0,0,0,0)); d=ImageDraw.Draw(layer)
    rgb=tuple(int(fill[i:i+2],16) for i in (1,3,5)); d.text(xy,s,font=f,fill=rgb+(int(255*alpha),),anchor=anchor)
    return Image.alpha_composite(base,layer)

def make(name, fast):
    out=f'designs/v2/bg-{name}-frames'; os.makedirs(out,exist_ok=True)
    for i in range(N):
        t=i/FPS; im=Image.new('RGBA',(W,H),BG); d=ImageDraw.Draw(im)
        # background grid: fast shifts far, slow barely
        step=72
        shift=(t*220)%step if fast else (t*8)%step
        col=(28,44,30) if not fast else (38,58,38)
        for x in range(-step, W+step, step):
            d.line((x+shift,0,x+shift,H), fill=col, width=1)
        for y in range(-step, H+step, step):
            d.line((0,y+shift*0.4,W,y+shift*0.4), fill=col, width=1)
        # scan line: fast loops, slow crosses once
        sy=(t*900)%H if fast else 300+t*190
        d.rectangle((0,sy,W,sy+2), fill=(60,90,55) if not fast else (115,160,80))
        # circles / ticks
        cx,cy=920,420
        r=150
        d.arc((cx-r,cy-r,cx+r,cy+r), 0, 300, fill=(40,60,40), width=2)
        ang=(t*220 if fast else t*25)%360
        ex=cx+r*math.cos(math.radians(ang)); ey=cy+r*math.sin(math.radians(ang))
        d.ellipse((ex-5,ey-5,ex+5,ey+5), fill=(80,120,70) if not fast else LIME)
        # brand
        d.line((108,90,108,140),fill=DANGER,width=6); d.text((132,104),'FIXED ADDRESS',font=F['brand'],fill=BRAND,anchor='lm')
        im=text(im,(540,300),'知识库 vs. RAG',F['kicker'],MUTED,ease((t-.15)/.35))
        lp=ease((t-.35)/.45); loff=(1-lp)*30
        im=text(im,(540,480),'静态存储',F['setup'],MUTED,lp)
        im=text(im,(540,560),'答案固定',F['turn'],WHITE,lp)
        im=text(im,(540,640),'更新慢',F['sub'],MUTED,lp)
        xp=ease((t-.95)/.5)
        if xp>0:
            d=ImageDraw.Draw(im); cx2,cy2=760,570; a=min(1,xp*2); b=max(0,min(1,(xp-.5)*2))
            d.line((cx2-48,cy2-48,cx2-48+96*a,cy2-48+96*a),fill=DANGER,width=16)
            d.line((cx2+48,cy2-48,cx2+48-96*b,cy2-48+96*b),fill=DANGER,width=16)
        rp=ease((t-.65)/.5); roff=(1-rp)*34
        im=text(im,(540,840),'动态检索',F['setup'],MUTED,rp)
        hp=ease((t-1.55)/.65); X0,X1,Y0,Y1=330,750,895,990
        if hp>0:
            d=ImageDraw.Draw(im); right=X0+(X1-X0)*hp; d.rectangle((X0,Y0,right,Y1),fill=LIME)
        im=text(im,(540,920),'实时生成',F['turn'],('#071008' if hp>=.99 else WHITE),rp)
        im=text(im,(540,1000),'跟资料走',F['sub'],MUTED,rp)
        yp=ease((t-1.25)/.5)
        if yp>0:
            d=ImageDraw.Draw(im)
            if yp<.5:
                q=yp/.5; d.line((800,900,800+40*q,900+45*q),fill=LIME,width=18)
            else:
                q=(yp-.5)/.5; d.line((800,900,840,945),fill=LIME,width=18); d.line((840,945,840+85*q,945-90*q),fill=LIME,width=18)
        cp=ease((t-2.25)/.55)
        im=text(im,(540,1360),'不是替代，是 协作',F['concl'],WHITE,cp)
        if cp>0: d=ImageDraw.Draw(im); d.line((108,1290,972,1290),fill='#2a3a2a',width=2)
        im=text(im,(108,1800),'固定地址',F['small'],BRAND,1,'lm')
        im=text(im,(972,1800),'FIXED ADDRESS · CONTENT STUDIO',F['small'],BRAND,1,'rm')
        im.convert('RGB').save(f'{out}/frame_{i:04d}.jpg',quality=92)
    mp4=f'designs/v2/bg-{name}.mp4'
    subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-framerate','30','-i',f'{out}/frame_%04d.jpg','-c:v','libx264','-pix_fmt','yuv420p','-crf','18',mp4],check=True)
    print(mp4)

make('fast', True)
make('slow', False)
