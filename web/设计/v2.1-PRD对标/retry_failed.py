#!/usr/bin/env python3
import time, sys
sys.path.insert(0, "/Users/caizaiheng/vscode/八字项目")
from image_sdk import ImageClient

client = ImageClient(idealab_api_key="2f7cd0882f14b327584a6d340380d8f0")
OUT = "/Users/caizaiheng/vscode/八字项目/web/设计/v2.1-PRD对标"
LOG = f"{OUT}/retry.log"

pages = [
    ("03-新增命主页",
     "iPhone 15 mobile app UI, warm peach gradient, coral buttons, Figma style. Form page: back arrow top-left, title. Vertical fields: name input, gender toggle, calendar toggle, date picker, time picker, city input, notes area. Coral save button at bottom."),
    ("06-详情页-问答Tab",
     "iPhone 15 mobile app UI, warm peach gradient, coral accent, Figma style. Top bar with back arrow and name. Three tab buttons, third one active. Chat interface: alternating right and left chat bubbles. Bottom text input bar with send button."),
]

def log(m):
    print(m, flush=True)
    with open(LOG, "a") as f:
        f.write(m + "\n")

open(LOG, "w").close()
log(f"[{time.strftime('%H:%M:%S')}] retry start\n")

for name, prompt in pages:
    log(f"[{time.strftime('%H:%M:%S')}] {name} ({len(prompt)}chars)...")
    t = time.time()
    try:
        r = client.generate(prompt=prompt, model="gpt-image-2-0421-global", size="1024x1024", quality="medium", n=1)
        e = time.time() - t
        if r.count > 0:
            open(f"{OUT}/{name}.png", "wb").write(r.images[0])
            log(f"[{time.strftime('%H:%M:%S')}] OK {name} ({e:.0f}s, {len(r.images[0]):,}B)")
        else:
            log(f"[{time.strftime('%H:%M:%S')}] FAIL {name} no images ({e:.0f}s)")
    except Exception as ex:
        log(f"[{time.strftime('%H:%M:%S')}] FAIL {name} ({time.time()-t:.0f}s): {ex}")

log(f"\n[{time.strftime('%H:%M:%S')}] retry done!")
