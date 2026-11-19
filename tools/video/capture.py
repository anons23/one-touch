"""Records One Touch gameplay frame by frame with a virtual clock (for CrazyGames preview videos).
Env: VIDEO_OUT (dir), VIEW=w,h,dpr,mobile, LOCALE."""
import asyncio, math, os, shutil, subprocess, sys, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.environ.get('VIDEO_OUT', os.path.join(ROOT, 'dist', 'video'))
FR = os.path.join(OUT, 'frames')
VIEW = [float(x) for x in os.environ.get('VIEW', '600,900,1.8,1').split(',')]
LOCALE = os.environ.get('LOCALE', 'en-US')
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
PORT = int(os.environ.get('PORT', '8793'))
FPS = 30
DT = 1000 / FPS
# level index, aim sweep start offset (radians)
SCENES = [(3, -0.45), (22, 0.5), (33, -0.4), (46, 0.35)]
AIM_S, PAUSE_S, HOLD_S = 1.1, 0.25, 0.9

CLOCK = """(()=>{let now=0,rafs=[],timers=[],tid=1;
performance.now=()=>now;const D0=1.7e12;Date.now=()=>D0+now;
window.requestAnimationFrame=cb=>{rafs.push(cb);return rafs.length};window.cancelAnimationFrame=()=>{};
window.setTimeout=(cb,ms,...a)=>{const id=tid++;timers.push({id,t:now+(ms||0),cb:()=>cb(...a)});return id};
window.clearTimeout=id=>{timers=timers.filter(x=>x.id!==id)};
window.setInterval=()=>0;window.clearInterval=()=>{};
window.__step=dt=>{now+=dt;const due=timers.filter(x=>x.t<=now);timers=timers.filter(x=>x.t>now);
 due.forEach(x=>{try{x.cb()}catch(e){console.error(e)}});const r=rafs;rafs=[];r.forEach(cb=>{try{cb(now)}catch(e){console.error(e)}})};
})();"""


def ease(t): return t * t * (3 - 2 * t)


async def main():
    shutil.rmtree(FR, ignore_errors=True); os.makedirs(FR)
    srv = subprocess.Popen([sys.executable, '-I', '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
            ctx = await b.new_context(viewport={'width': int(VIEW[0]), 'height': int(VIEW[1])}, device_scale_factor=VIEW[2],
                                      is_mobile=bool(VIEW[3]), has_touch=bool(VIEW[3]), locale=LOCALE)
            await ctx.add_init_script(CLOCK)
            pg = await ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(f'http://localhost:{PORT}/index.html')
            for _ in range(10): await pg.evaluate('__step(33)')
            n = 0

            async def shot():
                nonlocal n
                await pg.screenshot(path=os.path.join(FR, f'{n:05d}.jpg'), type='jpeg', quality=92)
                n += 1

            for lv, off in SCENES:
                await pg.evaluate(f'__ot.startLevel({lv})')
                sec = await pg.evaluate('__ot.state.level.secret')
                for k in range(int(AIM_S * FPS)):
                    a = sec + off * (1 - ease(k / (AIM_S * FPS - 1)))
                    await pg.evaluate('(a)=>{__ot.setAngle(a);__step(%f)}' % DT, a)
                    await shot()
                for k in range(int(PAUSE_S * FPS)):
                    await pg.evaluate(f'__step({DT})'); await shot()
                await pg.evaluate('__ot.fire()')
                won, k = None, 0
                while True:
                    await pg.evaluate(f'__step({DT})'); await shot(); k += 1
                    vis = await pg.evaluate("!document.getElementById('win').classList.contains('hidden')")
                    if vis and won is None: won = k
                    if won is not None and k - won >= HOLD_S * FPS: break
                    if k > FPS * 12: raise SystemExit(f'level {lv} not solved')
                print('scene', lv, 'frames', n)
            await b.close()
            if errs: print('PAGE ERRORS', errs[:5])
    finally:
        srv.terminate()

asyncio.run(main())
