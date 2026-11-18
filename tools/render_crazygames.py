"""Renders CrazyGames covers into store/crazygames/: captures real mid-flight frames of the game
canvas (Playwright + Chrome) and composes them with the title. Only the title is written on covers."""
import asyncio, os, subprocess, sys, time
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'store', 'crazygames')
TMP = os.path.join(ROOT, 'dist', 'frames')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
FONT = os.environ.get('TITLE_FONT', '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf')
PORT = 8792
LEVELS = [8, 33, 47]   # neon, sunset, space
TITLE = 'One Touch'


async def capture():
    srv = subprocess.Popen([sys.executable, '-I', '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
            ctx = await b.new_context(viewport={'width': 420, 'height': 800}, device_scale_factor=3, locale='en-US')
            pg = await ctx.new_page()
            await pg.goto(f'http://localhost:{PORT}/index.html')
            await pg.wait_for_timeout(800)
            os.makedirs(TMP, exist_ok=True)
            for lv in LEVELS:
                await pg.evaluate(f'__ot.startLevel({lv})')
                await pg.wait_for_timeout(400)
                await pg.evaluate(f"(async()=>{{const m=await import('./js/levels.js');__ot.setAngle(m.getLevel({lv}).secret);__ot.fire();}})()")
                await pg.wait_for_timeout(350)
                await pg.locator('#cv').screenshot(path=os.path.join(TMP, f'{lv}.png'))
            await b.close()
    finally:
        srv.terminate()


def background(w, h, c1=(10, 6, 20), c2=(36, 11, 60)):
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    step = max(40, w // 30)
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=(40, 16, 52))
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=(40, 16, 52))
    return im


def glow_text(im, text, size, xy, anchor='la', color=(240, 250, 255), glow=(0, 229, 255), glow2=(255, 45, 149)):
    font = ImageFont.truetype(FONT, size)
    w, h = im.size
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, text, font=font, anchor=anchor, fill=glow2 + (255,))
    pink = layer.filter(ImageFilter.GaussianBlur(size * 0.28))
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(xy, text, font=font, anchor=anchor, fill=glow + (255,))
    cyan = layer.filter(ImageFilter.GaussianBlur(size * 0.09))
    base = im.convert('RGBA')
    for g in (pink, cyan, cyan):
        base = Image.alpha_composite(base, g)
    ImageDraw.Draw(base).text(xy, text, font=font, anchor=anchor, fill=color + (255,))
    return base.convert('RGB')


def frame(lv, height):
    f = Image.open(os.path.join(TMP, f'{lv}.png')).convert('RGB')
    return f.resize((round(f.width * height / f.height), height), Image.LANCZOS)


def shade(im, top_h, strength=235):
    """Darkens the top band so the title stays readable over gameplay."""
    w, h = im.size
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    for y in range(top_h):
        d.line([(0, y), (w, y)], fill=int(strength * (1 - y / top_h) ** 1.4))
    return Image.composite(Image.new('RGB', (w, h), (8, 4, 16)), im, mask)


def landscape():
    im = background(1920, 1080)
    a, b = frame(33, 900), frame(8, 900)
    im.paste(b, (1920 - b.width - 70, 90))
    im.paste(a, (1920 - b.width - a.width - 120, 90))
    im = glow_text(im, 'One', 165, (100, 500), anchor='ls')
    return glow_text(im, 'Touch', 165, (100, 690), anchor='ls')


def portrait():
    im = background(800, 1200)
    f = frame(47, 900)
    im.paste(f, ((800 - f.width) // 2, 255))
    return glow_text(im, TITLE, 120, (400, 135), anchor='mm')


def square():
    im = background(800, 800)
    a, b = frame(33, 570), frame(8, 570)
    gap = (800 - a.width - b.width) // 3
    im.paste(a, (gap, 200))
    im.paste(b, (gap * 2 + a.width, 200))
    return glow_text(im, TITLE, 112, (400, 105), anchor='mm')


if __name__ == '__main__':
    if '--no-capture' not in sys.argv:
        asyncio.run(capture())
    os.makedirs(OUT, exist_ok=True)
    for name, fn in [('cover-landscape-1920x1080.png', landscape), ('cover-portrait-800x1200.png', portrait), ('cover-square-800x800.png', square)]:
        im = fn()
        im.save(os.path.join(OUT, name))
        print('art', name, im.size)
