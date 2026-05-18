#!/usr/bin/env python3
"""
八字命理报告一键生成脚本

用法:
    python generate.py --name "陶秀莉" --birth "1982-10-26 17:30" --gender 女
    python generate.py --name "蔡" --birth "1993-12-07 06:00" --gender 男

流程:
    1. 排盘引擎 → JSON（<2秒）
    2. 规则引擎 → 旺衰/格局/十神/合冲刑害/用神（<1秒）
    3. 模板渲染 → 骨架 Markdown（<1秒）
    4. 输出骨架 + 判读 prompt → 供 AI 填充判读槽位
"""

import argparse
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from jinja2 import Environment, FileSystemLoader
from engine.paipan import paipan
from engine.rules import full_analysis


def parse_birth(birth_str: str):
    """解析出生时间字符串"""
    parts = birth_str.strip().split()
    date_part = parts[0]
    time_part = parts[1] if len(parts) > 1 else "12:00"

    date_items = date_part.replace("/", "-").split("-")
    year = int(date_items[0])
    month = int(date_items[1])
    day = int(date_items[2])

    time_items = time_part.split(":")
    hour = int(time_items[0])
    minute = int(time_items[1]) if len(time_items) > 1 else 0

    return year, month, day, hour, minute


def generate_skeleton(name: str, birth_str: str, gender: str,
                      output_dir: str = None, name_short: str = None):
    """
    生成报告骨架（数据层 + 模板层，不含AI判读）

    返回: (paipan_data, rules_data, skeleton_master, skeleton_consumer, skeleton_index)
    """
    year, month, day, hour, minute = parse_birth(birth_str)

    # Phase 1: 排盘
    print(f"[1/4] 排盘中... {name} {birth_str} {gender}")
    paipan_data = paipan(year, month, day, hour, minute, gender)
    paipan_data["命主信息"]["姓名"] = name
    print(f"  ✅ 四柱: {paipan_data['四柱']['年柱']['天干']}{paipan_data['四柱']['年柱']['地支']}"
          f"/{paipan_data['四柱']['月柱']['天干']}{paipan_data['四柱']['月柱']['地支']}"
          f"/{paipan_data['四柱']['日柱']['天干']}{paipan_data['四柱']['日柱']['地支']}"
          f"/{paipan_data['四柱']['时柱']['天干']}{paipan_data['四柱']['时柱']['地支']}")

    # Phase 2: 规则分析
    print("[2/4] 规则分析中...")
    rules_data = full_analysis(paipan_data)
    print(f"  ✅ 旺衰: {rules_data['旺衰']['结论']} {rules_data['旺衰']['程度']}")
    print(f"  ✅ 格局: {rules_data['格局']['格局']}")
    print(f"  ✅ 用神: {[(y['五行'], y['十神']) for y in rules_data['用神忌神']['用神']]}")

    # Phase 3: 模板渲染
    print("[3/4] 模板渲染中...")
    if not name_short:
        name_short = f"{name}命v2"

    templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report", "templates")
    env = Environment(loader=FileSystemLoader(templates_dir))

    current_year = datetime.now().year
    gen_time = datetime.now().strftime("%Y-%m")

    # AI 判读占位符（已下沉到引擎的6个槽位不再需要AI填充）
    # 已下沉: wangshuai_renhua, yongshen_detail, shishen_zuhe,
    #         hechong_detail, shenshas_detail, dayun_zonglun
    ai_judge_keys = [
        "dangxia_dingwei", "geju_detail",
        "liunian_detail", "liuyue_detail", "liulingyu",
        "juanshou_sanjuhua", "wangshuai_consumer", "yongshen_consumer",
        "geju_yijuhua", "renge_huaxiang", "liuqin_kapian", "lingyu_kapian",
        "dangxia_consumer", "liunian_consumer", "liuyue_consumer", "sannian_qingdan",
        "rensheng_siduan", "juanwei_xin",
        "current_dayun", "index_summary",
        "wechat_summary",
    ]
    ai_judge = {k: f"<!-- AI_JUDGE_SLOT: {k} -->" for k in ai_judge_keys}

    render_ctx = {
        "name": name, "gender": gender, "gen_time": gen_time,
        "paipan": paipan_data, "rules": rules_data,
        "AI_JUDGE": ai_judge, "current_year": current_year,
        "name_short": name_short,
    }

    skeleton_master = env.get_template("master_report.md.j2").render(**render_ctx)
    skeleton_consumer = env.get_template("consumer_report.md.j2").render(**render_ctx)
    skeleton_wechat = env.get_template("wechat_report.md.j2").render(**render_ctx)
    skeleton_index = env.get_template("index_report.md.j2").render(**render_ctx)

    print(f"  ✅ 命理师版骨架: {len(skeleton_master.splitlines())} 行")
    print(f"  ✅ 消费者版骨架: {len(skeleton_consumer.splitlines())} 行")
    print(f"  ✅ 微信版骨架: {len(skeleton_wechat.splitlines())} 行")
    print(f"  ✅ 索引骨架: {len(skeleton_index.splitlines())} 行")

    # Phase 4: 输出
    print("[4/4] 输出中...")
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

        # 写入骨架文件
        with open(os.path.join(output_dir, f"{name_short}-命理师版-骨架.md"), "w") as f:
            f.write(skeleton_master)
        with open(os.path.join(output_dir, f"{name_short}-消费者版-骨架.md"), "w") as f:
            f.write(skeleton_consumer)
        with open(os.path.join(output_dir, f"{name_short}-微信版-骨架.md"), "w") as f:
            f.write(skeleton_wechat)
        with open(os.path.join(output_dir, f"{name_short}-索引-骨架.md"), "w") as f:
            f.write(skeleton_index)

        # 写入排盘+规则 JSON（供 AI 判读使用）
        ai_input = {
            "paipan": paipan_data,
            "rules": rules_data,
            "context": {
                "name": name,
                "gender": gender,
                "current_year": current_year,
                "current_age": current_year - year + 1,
                "extra_info": ""
            }
        }
        with open(os.path.join(output_dir, f"{name_short}-排盘数据.json"), "w") as f:
            json.dump(ai_input, f, ensure_ascii=False, indent=2)

        print(f"  ✅ 文件已输出到: {output_dir}/")
        print(f"     - {name_short}-命理师版-骨架.md")
        print(f"     - {name_short}-消费者版-骨架.md")
        print(f"     - {name_short}-微信版-骨架.md")
        print(f"     - {name_short}-索引-骨架.md")
        print(f"     - {name_short}-排盘数据.json")
    else:
        print("  ⚠️  未指定输出目录，仅打印摘要")

    print("\n" + "=" * 60)
    print("✅ 骨架生成完成！")
    print("=" * 60)
    print("\n📋 下一步：将「排盘数据.json」+ report/prompts/judge.md 发给 AI，")
    print("   让 AI 填充所有 AI_JUDGE_SLOT 判读槽位，")
    print("   然后替换骨架中的占位符即可得到最终报告。")

    return paipan_data, rules_data, skeleton_master, skeleton_consumer, skeleton_wechat, skeleton_index


def main():
    parser = argparse.ArgumentParser(description="八字命理报告一键生成")
    parser.add_argument("--name", required=True, help="命主姓名")
    parser.add_argument("--birth", required=True, help="出生时间 (格式: YYYY-MM-DD HH:MM)")
    parser.add_argument("--gender", required=True, choices=["男", "女"], help="性别")
    parser.add_argument("--output", default=None, help="输出目录 (默认: ./<name>命v2/)")
    parser.add_argument("--short-name", default=None, help="文件名前缀 (默认: <name>命v2)")

    args = parser.parse_args()

    output_dir = args.output or os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        f"{args.name}命v2"
    )
    name_short = args.short_name or f"{args.name}命v2"

    generate_skeleton(
        name=args.name,
        birth_str=args.birth,
        gender=args.gender,
        output_dir=output_dir,
        name_short=name_short,
    )


if __name__ == "__main__":
    main()
