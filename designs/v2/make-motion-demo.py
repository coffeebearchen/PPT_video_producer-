from PIL import Image, ImageDraw, ImageFont
import os, math

W,H = 1080,1920
FPS = 30
DUR = 5.0
N = int(FPS*DUR)
out = 'designs/v2/motion-frames'
os.makedirs(out, exist_ok=True)

def font(size, serif=False):
    return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc' if not serif else 'C:/Windows/Fonts/simsun.ttc', size)

F = {
    'brand': font(24),
    'kicker': font(32),
    'setup': font(40),
    'turn': font(96, True),
    'sub': font(28),
    'concl': font(54),
    'small': font(24),
}
BG = '#070b09'
WHITE = '#e9f4e6'
MUTED = '#9bb397'
LIME = '#b6ff3b'
AMBER = '#ffb648'
DANGER = '#ff6b3d'

def ease(p):
    p = max(0,min(1,p))
    return 1-(1-p)**3

def alpha_text(base, xy, text, f, fill, alpha=1, anchor='mm'):
    if alpha <= 0: return base
    layer = Image.new('RGBA', base.size, (0,0,0,0))
    d = ImageDraw.Draw(layer)
    rgb = tuple(int(fill[i:i+2],16) for i in (1,3,5))
    d.text(xy, text, font=f, fill=rgb+(int(255*alpha),), anchor=anchor)
    return Image.alpha_composite(base, layer)

def line(base, xy, fill, width=14, p=1):
    if p <= 0: return base
    d = ImageDraw.Draw(base)
    x1,y1,x2,y2 = xy
    x2 = x1+(x2-x1)*p; y2 = y1+(y2-y1)*p
    d.line((x1,y1,x2,y2), fill=fill, width=width)
    return base

for i in range(N):
    t = i/FPS
    im = Image.new('RGBA',(W,H),BG)
    d = ImageDraw.Draw(im)
    # brand
    d.line((108,90,108,140), fill=DANGER, width=6)
    d.text((132,104),'FIXED ADDRESS',font=F['brand'],fill='#7f927d',anchor='lm')

    # kicker
    ka = ease((t-.15)/.35)
    im = alpha_text(im,(540,300),'知识库 vs. RAG',F['kicker'],MUTED,ka)

    # left block appears first
    lp = ease((t-.35)/.45)
    off = (1-lp)*30
    im = alpha_text(im,(540,480+off),'静态存储',F['setup'],MUTED,lp)
    im = alpha_text(im,(540,560+off),'答案固定',F['turn'],WHITE,lp)
    im = alpha_text(im,(540,640+off),'更新慢',F['sub'],MUTED,lp)

    # x draw
    xp = ease((t-.95)/.5)
    if xp>0:
        d = ImageDraw.Draw(im)
        cx,cy=760,570
        # 2 strokes, each half time
        p1=min(1,xp*2); p2=max(0,min(1,(xp-.5)*2))
        d.line((cx-48,cy-48,cx-48+96*p1,cy-48+96*p1),fill=DANGER,width=16)
        d.line((cx+48,cy-48,cx+48-96*p2,cy-48+96*p2),fill=DANGER,width=16)

    # right block
    rp = ease((t-.65)/.5)
    roff = (1-rp)*34
    im = alpha_text(im,(540,840+roff),'动态检索',F['setup'],MUTED,rp)
    # highlight sweep
    hp = ease((t-1.55)/.65)
    # draw text after background
    # rect behind text bounds approx
    if hp>0:
        d = ImageDraw.Draw(im)
        x0,x1,y0,y1 = 330,750,895,990
        d.rectangle((x0,y0,x0+(x1-x0)*hp,y1),fill=LIME)
    im = alpha_text(im,(540,920+roff),'实时生成',F['turn'],('#071008' if hp>=.99 else WHITE),rp)
    im = alpha_text(im,(540,1000+roff),'跟资料走',F['sub'],MUTED,rp)
    # check draw
    yp = ease((t-1.25)/.5)
    if yp>0:
        d = ImageDraw.Draw(im)
        # check mark polyline progress simple two segments
        pts=[(800,900),(840,945),(925,855)]
        # draw approximate by scaled endpoints
        if yp<.5:
            p=yp/.5; d.line((800,900,800+40*p,900+45*p),fill=LIME,width=18)
        else:
            p=(yp-.5)/.5; d.line((800,900,840,945),fill=LIME,width=18); d.line((840,945,840+85*p,945-90*p),fill=LIME,width=18)

    # conclusion
    cp = ease((t-2.25)/.55)
    im = alpha_text(im,(540,1360),'不是替代，是 协作',F['concl'],WHITE,cp)
    if cp>0:
        d=ImageDraw.Draw(im); d.line((108,1290,972,1290),fill='#2a3a2a',width=2)

    # bottom small
    im = alpha_text(im,(108,1800),'固定地址',F['small'],'#7f927d',1,'lm')
    im = alpha_text(im,(972,1800),'FIXED ADDRESS · CONTENT STUDIO',F['small'],'#7f927d',1,'rm')

    im.convert('RGB').save(f'{out}/frame_{i:04d}.jpg',quality=92)
print('frames',N)


