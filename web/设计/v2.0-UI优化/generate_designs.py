#!/usr/bin/env python3
"""批量生成6个页面的高保真UI设计稿 - 修正版(quality=medium)"""
import time, sys
sys.path.insert(0, "/Users/caizaiheng/vscode/八字项目")
from image_sdk import ImageClient

client = ImageClient(idealab_api_key="2f7cd0882f14b327584a6d340380d8f0")
OUT = "/Users/caizaiheng/vscode/八字项目/web/设计/v2.0-UI优化"
LOG = f"{OUT}/progress.log"

S = "High-fidelity mobile UI mockup in iPhone frame, Figma-quality, modern warm style, soft peach-cream gradient bg, rounded corners, coral accents, Chinese text, subtle shadows. "

PAGES = [
    ("01-密码验证页", S + "Login screen centered. Title in elegant font, subtitle, password input, coral gradient button. Zen minimal."),
    ("02-命主列表页", S + "List page header with + button. 4 white cards with name, gender, birth date, city, status badge."),
    ("03-新增命主页", S + "Form page back arrow. Name input, gender pills, calendar pills, date picker, time picker, city, notes, coral save button."),
    ("04-详情页-信息Tab", S + "Detail info tab. Back arrow, name, 3 tabs coral underline active. Info rows labels values. Edit button."),
    ("05-详情页-报告Tab", S + "Detail report tab. Green status card. Three report cards coral left border with action buttons."),
    ("06-详情页-问答Tab", S + "Detail chat tab. Chat bubbles user dark right AI light left. Bottom input bar coral send button."),
]

def log(m):
    print(m, flush=True)
    with open(LOG, "a") as f: f.write(m + "\n")

open(LOG, "w").close()
log(f"[{time.strftime('%H:%M:%S')}] Start generating 6 pages (quality=medium)...\n")

for i, (name, prompt) in enumerate(PAGES):
    log(f"[{time.strftime('%H:%M:%S')}] [{i+1}/6] {name}...")
    t = time.time()
    try:
        r = client.generate(prompt=prompt, model="gpt-image-2-0421-global", size="1024x1024", quality="medium", n=1)
        e = time.time() - t
        if r.count > 0:
            open(f"{OUT}/{name}.png", "wb").write(r.images[0])
            log(f"[{time.strftime('%H:%M:%S')}] OK {name} ({e:.0f}s, {len(r.images[0]):,}B)")
        else:
            log(f"[{time.strftime('%H:%M:%S')}] FAIL {name} no image ({e:.0f}s)")
    except Exception as ex:
        log(f"[{time.strftime('%H:%M:%S')}] FAIL {name} ({time.time()-t:.0f}s): {ex}")

log(f"\n[{time.strftime('%H:%M:%S')}] ALL DONE!")
