#!/usr/bin/env python3
"""v2.1 UI设计稿 - generate接口 + 精简prompt(<=600chars) + PRD对标"""
import time, sys
sys.path.insert(0, "/Users/caizaiheng/vscode/八字项目")
from image_sdk import ImageClient

client = ImageClient(idealab_api_key="2f7cd0882f14b327584a6d340380d8f0")
OUT = "/Users/caizaiheng/vscode/八字项目/web/设计/v2.1-PRD对标"
LOG = f"{OUT}/progress.log"

PAGES = [
    ("01-密码验证页",
     "iPhone 15 UI mockup, warm peach gradient bg, coral accent, Chinese text, Figma quality. Centered login: title 我命由天挺好的, password input 请输入密码, coral button 进入. Only these 3 elements, nothing else."),
    ("02-命主列表页",
     "iPhone 15 UI, warm peach bg, coral accent, Chinese. Top bar: 我命由天挺好的 left, +新增 right. 3 cards: 张三男 1993-12-07公历 已生成报告✅ green; 李四女 1988-05-20公历 未生成⏳ gray; 王五男 1975-10-26农历 生成中🔄 orange."),
    ("03-新增命主页",
     "iPhone 15 UI, warm peach bg, coral accent, Chinese form page. Top: ←返回, 新增命主. Fields: 姓名 input, 性别 pills 男女, 日历 pills 公历农历, 出生日期 1993-12-07, 出生时间 06:00, 出生城市 input, 备注 textarea. Coral 保存 button bottom."),
    ("04-详情页-信息Tab",
     "iPhone 15 UI, warm peach bg, coral accent, Chinese. Top: ←返回, 张三. Tabs: 信息(active), 报告, 问答. Rows: 姓名张三, 性别男, 出生1993-12-07, 时间06:00, 城市杭州, 备注程序员已婚. Button 编辑信息. Yellow banner ⚠信息已更新建议重新生成报告."),
    ("05-详情页-报告Tab",
     "iPhone 15 UI, warm peach bg, coral accent, Chinese. Top: ←返回, 张三. Tabs: 信息, 报告(active), 问答. Green card ✅报告已生成 🔄重新生成. Cards: 📄命理师版 查看+下载; 📄消费者版 查看+下载; 📄微信版 查看+复制📋."),
    ("06-详情页-问答Tab",
     "iPhone 15 UI, warm peach bg, coral accent, Chinese chat page. Top: ←返回, 张三. Tabs: 信息, 报告, 问答(active). Chat bubbles: right 🧑今年适合跳槽吗; left 🤖八字丙午流年辛金正财...; right 🧑感情方面呢; left 🤖日支婚姻宫... Bottom input bar + coral 发送."),
]

def log(m):
    print(m, flush=True)
    with open(LOG, "a") as f: f.write(m + "\n")

open(LOG, "w").close()
log(f"[{time.strftime('%H:%M:%S')}] v2.1 开始 (精简prompt, <=250chars)\n")

for i, (name, prompt) in enumerate(PAGES):
    log(f"[{time.strftime('%H:%M:%S')}] [{i+1}/6] {name} ({len(prompt)}chars)...")
    t = time.time()
    try:
        r = client.generate(prompt=prompt, model="gpt-image-2-0421-global", size="1024x1024", quality="medium", n=1)
        e = time.time() - t
        if r.count > 0:
            open(f"{OUT}/{name}.png", "wb").write(r.images[0])
            log(f"[{time.strftime('%H:%M:%S')}] ✅ {name} ({e:.0f}s, {len(r.images[0]):,}B)")
        else:
            log(f"[{time.strftime('%H:%M:%S')}] ❌ {name} 无图 ({e:.0f}s)")
    except Exception as ex:
        log(f"[{time.strftime('%H:%M:%S')}] ❌ {name} ({time.time()-t:.0f}s): {ex}")

log(f"\n[{time.strftime('%H:%M:%S')}] ALL DONE!")
