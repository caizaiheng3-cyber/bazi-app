#!/usr/bin/env python3
"""
报告层标准能力：完整报告生成脚本（v2 - 上下文摘要传递版）
排盘 → 规则 → 骨架 → DeepSeek AI 分段判读（带上下文摘要传递）→ 输出完整报告

核心改进：
- 命理师版拆5次调用（Part0+1 / Part2 / Part3 / Part4上 / Part4下）
- 消费者版拆3次调用（卷首+板块①② / 板块③④ / 板块⑤+卷尾）
- 每次调用携带「核心事实摘要」，确保前后一致性
- 摘要采用 A+B 结合：引擎数据规则提取(B) + AI洞察总结(A)

用法:
    python scripts/generate_full_report.py \
        --name "蔡再恒" --birth "1993-12-07 06:00" --gender 男 \
        --output casework/蔡命-质量验证
"""

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import httpx
from jinja2 import Environment, FileSystemLoader
from engine.paipan import paipan
from engine.rules import (
    full_analysis,
    generate_liuqin_text, generate_liunian_text, generate_liuyue_text,
    generate_dangxia_text, generate_rensheng_siduan_text,
)

TEMPLATES_PATH = PROJECT_ROOT / "report" / "templates"
PROMPTS_PATH = PROJECT_ROOT / "report" / "prompts"
EXAMPLES_PATH = PROJECT_ROOT / "report" / "examples"

DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")


# ============================================================
# Phase 1-3: 排盘 → 规则 → 骨架
# ============================================================

def run_paipan(name: str, birth_str: str, gender: str) -> dict:
    """Phase 1: 排盘"""
    print(f"[1/8] 排盘中... {name} {birth_str} {gender}")
    parts = birth_str.split(" ")
    date_parts = parts[0].split("-")
    time_parts = parts[1].split(":")
    year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    hour, minute = int(time_parts[0]), int(time_parts[1])
    result = paipan(year, month, day, hour, minute, gender, name)
    print(f"  ✅ 四柱: {result['四柱']['年柱']['天干']}{result['四柱']['年柱']['地支']} "
          f"{result['四柱']['月柱']['天干']}{result['四柱']['月柱']['地支']} "
          f"{result['四柱']['日柱']['天干']}{result['四柱']['日柱']['地支']} "
          f"{result['四柱']['时柱']['天干']}{result['四柱']['时柱']['地支']}")
    return result


def run_rules(paipan_data: dict, gender: str = "男") -> dict:
    """Phase 2: 规则分析"""
    print("[2/8] 规则分析中...")
    result = full_analysis(paipan_data, gender=gender)
    print(f"  ✅ 旺衰: {result['旺衰']['结论']} {result['旺衰']['程度']}")
    print(f"  ✅ 格局: {result['格局']['格局']}")
    print(f"  ✅ 用神: {[(y['五行'], y['十神']) for y in result['用神忌神']['用神']]}")
    print(f"  ✅ 六亲/流年/流月/当下/四段: 引擎确定性数据已生成")
    return result


def render_skeletons(name: str, gender: str, paipan_data: dict, rules_data: dict) -> dict:
    """Phase 3: 模板渲染骨架"""
    print("[3/8] 模板渲染中...")
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_PATH)))
    current_year = datetime.now().year
    ai_judge_keys = [
        "dangxia_dingwei", "geju_detail", "liunian_detail", "liuyue_detail",
        "liulingyu", "juanshou_sanjuhua", "wangshuai_consumer", "yongshen_consumer",
        "geju_yijuhua", "renge_huaxiang", "liuqin_kapian", "lingyu_kapian",
        "dangxia_consumer", "liunian_consumer", "liuyue_consumer", "sannian_qingdan",
        "rensheng_siduan", "juanwei_xin", "current_dayun", "index_summary",
        "wechat_summary",
    ]
    ai_judge = {k: f"【待填充：{k}】" for k in ai_judge_keys}
    context = {
        "paipan": paipan_data, "rules": rules_data,
        "AI_JUDGE": ai_judge, "current_year": current_year,
        "name": name, "gender": gender,
    }
    skeletons = {}
    for key, template_name in [
        ("master", "master_report.md.j2"),
        ("consumer", "consumer_report.md.j2"),
        ("wechat", "wechat_report.md.j2"),
        ("index", "index_report.md.j2"),
    ]:
        template = env.get_template(template_name)
        skeletons[key] = template.render(**context)
    print(f"  ✅ 命理师版骨架: {len(skeletons['master'].splitlines())} 行")
    print(f"  ✅ 消费者版骨架: {len(skeletons['consumer'].splitlines())} 行")
    print(f"  ✅ 微信版骨架: {len(skeletons['wechat'].splitlines())} 行")
    print(f"  ✅ 索引骨架: {len(skeletons['index'].splitlines())} 行")
    return skeletons


# ============================================================
# 基础设施：AI 调用 & 工具函数
# ============================================================

def build_judge_prompt(paipan_data: dict, rules_data: dict, name: str, gender: str) -> str:
    """构建 AI 判读的系统 prompt"""
    judge_prompt = (PROMPTS_PATH / "judge.md").read_text(encoding="utf-8")
    current_year = datetime.now().year
    current_dayun = None
    dayun_info = paipan_data.get("大运", {})
    dayun_list = dayun_info.get("大运列表", []) if isinstance(dayun_info, dict) else []
    birth_year = paipan_data.get("基本信息", {}).get("公历", {}).get("年", 1990)
    current_age = current_year - birth_year + 1
    for dayun in dayun_list:
        if isinstance(dayun, dict):
            start_age = dayun.get("起始虚岁", 0)
            end_age = dayun.get("结束虚岁", 0)
            if start_age <= current_age <= end_age:
                current_dayun = dayun
                break
    ai_input = {
        "paipan": paipan_data,
        "rules": rules_data,
        "context": {
            "name": name, "gender": gender,
            "current_year": current_year, "current_age": current_age,
            "current_dayun": str(current_dayun) if current_dayun else "未匹配",
        },
    }
    return f"{judge_prompt}\n\n## 本次输入数据\n\n```json\n{json.dumps(ai_input, ensure_ascii=False, indent=2)}\n```"


async def call_deepseek(system_prompt: str, user_prompt: str,
                        max_tokens: int = 16384, temperature: float = 0.3) -> str:
    """调用 DeepSeek API"""
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=60.0)) as client:
        response = await client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
                "frequency_penalty": 0.3,
            },
        )
        response.raise_for_status()
        raw_content = response.json()["choices"][0]["message"]["content"]
        return clean_repetitive_chars(raw_content)


def clean_repetitive_chars(text: str) -> str:
    """清理 AI 输出中因重复生成导致的大量填充字符（如 ░ 进度条溢出）"""
    text = re.sub(r'([░▓█▒]{20})[░▓█▒]+', r'\1', text)
    text = re.sub(r'(.)\1{50,}', lambda m: m.group(1) * 20, text)
    return text


def clean_ai_preamble(text: str) -> str:
    """清理 AI 输出开头的角色回复，找到第一个 # 标题"""
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if line.strip().startswith("#"):
            return "\n".join(lines[i:])
    return text


def clean_wechat_report(text: str) -> str:
    """清理微信版报告中的 markdown 标记"""
    text = re.sub(r'^#+\s+.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'^---+$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^>\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ============================================================
# 核心事实摘要：A+B 结合提取
# ============================================================

def extract_engine_summary(paipan_data: dict, rules_data: dict, name: str, gender: str) -> str:
    """方案B：从引擎数据中规则提取核心事实摘要（确定性数据，不依赖AI）"""
    current_year = datetime.now().year
    # 从 "出生公历" 字段提取年份（格式如 "1993年12月7日 06:00"）
    birth_str = paipan_data.get("命主信息", {}).get("出生公历", "")
    year_match = re.search(r"(\d{4})年", birth_str)
    birth_year = int(year_match.group(1)) if year_match else 1990
    current_age = current_year - birth_year + 1

    sizhu = paipan_data.get("四柱", {})
    four_pillars = (
        f"{sizhu['年柱']['天干']}{sizhu['年柱']['地支']}/"
        f"{sizhu['月柱']['天干']}{sizhu['月柱']['地支']}/"
        f"{sizhu['日柱']['天干']}{sizhu['日柱']['地支']}/"
        f"{sizhu['时柱']['天干']}{sizhu['时柱']['地支']}"
    )
    day_master = sizhu['日柱']['天干']

    wangshuai = rules_data.get("旺衰", {})
    geju = rules_data.get("格局", {})
    yongshen = rules_data.get("用神忌神", {})
    yongshen_list = ", ".join(f"{y['五行']}({y['十神']})" for y in yongshen.get("用神", []))
    jishen_list = ", ".join(f"{j['五行']}({j['十神']})" for j in yongshen.get("忌神", []))

    wuxing_score = paipan_data.get("五行统计", {}).get("得分", {})
    wuxing_pct = paipan_data.get("五行统计", {}).get("百分比", {})
    if wuxing_score and wuxing_pct:
        wuxing_str = ", ".join(
            f"{k}{v}({wuxing_pct.get(k, '?')}%)" for k, v in wuxing_score.items()
        )
    elif wuxing_score:
        wuxing_str = ", ".join(f"{k}{v}" for k, v in wuxing_score.items())
    else:
        wuxing_str = "未知"

    current_dayun = "未匹配"
    dayun_info = paipan_data.get("大运", {})
    dayun_list = dayun_info.get("大运列表", []) if isinstance(dayun_info, dict) else []
    for dayun in dayun_list:
        if isinstance(dayun, dict):
            start_age = dayun.get("起始虚岁", 0)
            end_age = dayun.get("结束虚岁", 0)
            if start_age <= current_age <= end_age:
                remaining = end_age - current_age
                current_dayun = (
                    f"{dayun['干支']}（{dayun['天干十神']}，"
                    f"虚岁{start_age}-{end_age}，剩余{remaining}年）"
                )
                break

    shishen_dist = rules_data.get("十神分布", {}).get("分布", {})
    strongest = ""
    if shishen_dist:
        strength_map = {k: v.get("力量", 0) for k, v in shishen_dist.items()}
        sorted_ss = sorted(strength_map.items(), key=lambda x: x[1], reverse=True)
        top3 = [f"{k}(力量{v})" for k, v in sorted_ss[:3]]
        strongest = "、".join(top3)

    # 从 rules_data 获取引擎已生成的确定性文本（优先使用引擎数据）
    engine_texts = rules_data.get("推演文本", {})
    liuqin_text = engine_texts.get("liuqin_detail", generate_liuqin_text(paipan_data, gender))
    liunian_text = engine_texts.get("liunian_detail", generate_liunian_text(paipan_data, 6))
    liuyue_text = engine_texts.get("liuyue_detail", generate_liuyue_text(paipan_data))
    dangxia_text = engine_texts.get("dangxia_detail", generate_dangxia_text(paipan_data, gender))
    rensheng_text = engine_texts.get("rensheng_siduan", generate_rensheng_siduan_text(paipan_data))

    return (
        f"## 已确定的核心事实（后续章节必须与以下事实保持一致，不得矛盾）\n\n"
        f"- 命主：{name}，{gender}，{birth_year}年生，当前虚岁{current_age}\n"
        f"- 四柱：{four_pillars}\n"
        f"- 日主：{day_master}\n"
        f"- 旺衰：{wangshuai.get('结论', '未知')} {wangshuai.get('程度', '')}\n"
        f"- 五行得分：{wuxing_str}\n"
        f"- 格局：{geju.get('格局', '未知')}\n"
        f"- 用神：{yongshen_list}\n"
        f"- 忌神：{jishen_list}\n"
        f"- 十神力量TOP3：{strongest}\n"
        f"- 当前大运：{current_dayun}\n\n"
        f"---\n\n"
        f"{dangxia_text}\n\n"
        f"---\n\n"
        f"{liuqin_text}\n\n"
        f"---\n\n"
        f"{liunian_text}\n\n"
        f"---\n\n"
        f"{liuyue_text}\n\n"
        f"---\n\n"
        f"{rensheng_text}"
    )


async def generate_ai_insight_summary(judge_prompt: str, generated_text: str) -> str:
    """方案A：让 AI 从已生成的报告中提取洞察性结论摘要"""
    summary_prompt = (
        "请用300字以内总结以上报告中的核心命理洞察，"
        "重点提取以下内容（如有）：\n"
        "1. 格局组合效应（如杀印相生、食伤全缺等关键矛盾）\n"
        "2. 战略级判断（如先难后易、大器晚成等人生走势）\n"
        "3. 关键矛盾点和核心痛点\n"
        "4. 最重要的干支合冲刑害效应\n"
        "5. 大运转折时间点\n\n"
        "输出格式：直接输出要点列表，每条一行，以 - 开头。不要加标题。\n\n"
        f"## 已生成的报告内容\n\n{generated_text}"
    )
    result = await call_deepseek(judge_prompt, summary_prompt, max_tokens=2048)
    return result.strip()


def build_context_summary(engine_summary: str, ai_insights: str) -> str:
    """合并引擎摘要(B)和AI洞察摘要(A)为完整的上下文摘要"""
    return (
        f"{engine_summary}\n"
        f"### AI 判读洞察（来自已生成的报告章节）\n\n"
        f"{ai_insights}\n"
    )


# ============================================================
# 骨架拆分工具
# ============================================================

def split_master_skeleton(skeleton: str) -> dict:
    """将命理师版骨架拆分为各 Part"""
    parts = {}
    current_key = None
    current_lines = []
    for line in skeleton.split("\n"):
        if line.strip().startswith("## Part"):
            if current_key is not None:
                parts[current_key] = "\n".join(current_lines)
            match = re.match(r"## Part (\d+)", line.strip())
            current_key = f"part{match.group(1)}" if match else "unknown"
            current_lines = [line]
        elif current_key is None:
            if "header" not in parts:
                parts["header"] = ""
            parts["header"] += line + "\n"
        else:
            current_lines.append(line)
    if current_key is not None:
        parts[current_key] = "\n".join(current_lines)
    return parts


def split_consumer_skeleton(skeleton: str) -> dict:
    """将消费者版骨架拆分为各板块"""
    section_map = {
        "卷首": "juanshou", "板块 ①": "bankuai1", "板块①": "bankuai1",
        "板块 ②": "bankuai2", "板块②": "bankuai2",
        "板块 ③": "bankuai3", "板块③": "bankuai3",
        "板块 ④": "bankuai4", "板块④": "bankuai4",
        "板块 ⑤": "bankuai5", "板块⑤": "bankuai5",
        "卷尾": "juanwei",
    }
    sections = {}
    current_key = None
    current_lines = []
    for line in skeleton.split("\n"):
        if line.strip().startswith("## "):
            if current_key is not None:
                sections[current_key] = "\n".join(current_lines)
            header = line.strip()
            matched_key = None
            for keyword, key in section_map.items():
                if keyword in header:
                    matched_key = key
                    break
            current_key = matched_key or header[:20]
            current_lines = [line]
        elif current_key is None:
            if "header" not in sections:
                sections["header"] = ""
            sections["header"] += line + "\n"
        else:
            current_lines.append(line)
    if current_key is not None:
        sections[current_key] = "\n".join(current_lines)
    return sections




# ============================================================
# Phase 4: 命理师版 - 5次分段调用
# ============================================================

MASTER_FILL_RULES = (
    "## 填充铁律\n"
    "1. 每个【待填充：xxx】必须替换为对应的判读内容，禁止原样保留\n"
    "2. 直接从骨架的标题开始输出，不要加任何AI角色回复/寒暄\n"
    "3. 保留骨架中已有的引擎数据和表格，只填充待填充占位符\n"
    "4. 所有判读必须与「核心事实摘要」保持一致，不得矛盾\n"
)

PART4_DOMAIN_RULES = (
    "## 六领域填充铁律\n"
    "1. 必须包含3层：L1事实层（命理依据）、L2影响层（翻译成人话）、L3趋利避害（可执行建议+时间窗口）\n"
    "2. 每个领域不少于800字\n"
    "3. 直接从标题开始输出，不要加任何AI角色回复\n"
    "4. 所有判读必须与「核心事实摘要」和「已生成报告的洞察」保持一致\n"
)


async def generate_master_report(
    judge_prompt: str, skeleton: str, engine_summary: str
) -> str:
    """命理师版：5次分段调用 + 上下文摘要传递"""
    print("[4/8] AI 判读 - 命理师版（5段式）...")

    skeleton_parts = split_master_skeleton(skeleton)
    header = skeleton_parts.get("header", "")
    accumulated_report = header
    context_summary = engine_summary
    ai_insights = ""

    # --- 第1次：Part0 + Part1（排盘基础 + 命局核心结构）---
    part01_skeleton = (
        skeleton_parts.get("part0", "") + "\n\n" + skeleton_parts.get("part1", "")
    )
    prompt_part01 = (
        f"请基于排盘数据，填充以下命理师版报告骨架的 Part0（命主基础信息）和 Part1（命局核心结构）。\n\n"
        f"{context_summary}\n\n"
        f"{MASTER_FILL_RULES}\n"
        f"### Part0 特别要求\n"
        f"- 【待填充：dangxia_dingwei】= 当下定位深度分析（当前大运+流年+命主处境），不少于200字\n\n"
        f"### Part1 特别要求\n"
        f"- 【待填充：geju_detail】= 格局组合效应深度分析"
        f"（杀印相生/食伤全缺/关键矛盾），不少于500字\n\n"
        f"## 骨架\n\n{part01_skeleton}"
    )
    result_part01 = await call_deepseek(judge_prompt, prompt_part01)
    result_part01 = clean_ai_preamble(result_part01)
    accumulated_report += "\n\n" + result_part01
    print(f"  ✅ Part0+1: {len(result_part01)} 字")

    # 生成 AI 洞察摘要（从 Part0+1 中提取战略级判断）
    ai_insights = await generate_ai_insight_summary(judge_prompt, result_part01)
    context_summary = build_context_summary(engine_summary, ai_insights)
    print(f"  📋 洞察摘要已更新: {len(ai_insights)} 字")

    # --- 第2次：Part2（干支动力关系，含合冲刑害数据）---
    part2_skeleton = skeleton_parts.get("part2", "")
    if part2_skeleton.strip():
        prompt_part2 = (
            f"请基于排盘数据，输出命理师版报告的 Part2（干支动力关系）。\n\n"
            f"{context_summary}\n\n"
            f"{MASTER_FILL_RULES}\n"
            f"### Part2 特别要求\n"
            f"- 保留骨架中的所有合冲刑害数据表格\n"
            f"- 在每组合冲刑害关系后补充深度解读"
            f"（对命主的实际影响+在当前大运/流年中的激活情况）\n"
            f"- 如果骨架中没有待填充占位符，直接输出骨架内容并补充解读\n\n"
            f"## 骨架\n\n{part2_skeleton}"
        )
        result_part2 = await call_deepseek(judge_prompt, prompt_part2)
        result_part2 = clean_ai_preamble(result_part2)
        accumulated_report += "\n\n" + result_part2
        print(f"  ✅ Part2: {len(result_part2)} 字")

    # --- 第3次：Part3（大运流年深度）---
    part3_skeleton = skeleton_parts.get("part3", "")
    current_year = datetime.now().year
    prompt_part3 = (
        f"请基于排盘数据，填充命理师版报告的 Part3（大运流年深度分析）。\n\n"
        f"{context_summary}\n\n"
        f"{MASTER_FILL_RULES}\n"
        f"### Part3 特别要求\n"
        f"- 【待填充：liunian_detail】= 近6年逐年深度（每年含天干十神+地支五行"
        f"+事业/财富/感情/健康四维征兆+趋利避害），每年不少于250字\n"
        f"- 【待填充：liuyue_detail】= {current_year}年12个月逐月指南，"
        f"重点月份展开分析，每月不少于100字\n\n"
        f"## 骨架\n\n{part3_skeleton}"
    )
    result_part3 = await call_deepseek(judge_prompt, prompt_part3)
    result_part3 = clean_ai_preamble(result_part3)
    accumulated_report += "\n\n" + result_part3
    print(f"  ✅ Part3: {len(result_part3)} 字")

    # 更新洞察摘要（加入流年信号）
    liunian_insight = await generate_ai_insight_summary(judge_prompt, result_part3)
    ai_insights += "\n" + liunian_insight
    context_summary = build_context_summary(engine_summary, ai_insights)
    print(f"  📋 洞察摘要已更新（含流年）: {len(ai_insights)} 字")

    # --- 第4次：Part4 上半（婚姻·感情 + 财富·收入 + 事业·职业）---
    prompt_part4_upper = (
        f"请撰写命理师版报告 Part4 六领域深度分析的前3个领域。\n\n"
        f"{context_summary}\n\n"
        f"{PART4_DOMAIN_RULES}\n"
        f"请输出以下3个领域，每个领域包含 L1/L2/L3 三层：\n\n"
        f"## Part 4 · 六领域深度分析\n\n"
        f"### 4.1 婚姻·感情\n"
        f"（分析配偶宫、配偶星、桃花、合冲对婚姻的影响，给出婚期窗口和择偶方向）\n\n"
        f"### 4.2 财富·收入\n"
        f"（分析财星力量、劫财对财的影响、求财方式和财运走势）\n\n"
        f"### 4.3 事业·职业发展\n"
        f"（分析官杀印食对事业的影响、适合的行业方向、升迁时间窗口）\n"
    )
    result_part4_upper = await call_deepseek(judge_prompt, prompt_part4_upper)
    result_part4_upper = clean_ai_preamble(result_part4_upper)
    print(f"  ✅ Part4-上（婚姻+财富+事业）: {len(result_part4_upper)} 字")

    # --- 第5次：Part4 下半（健康·身体 + 六亲·人际 + 自我·心性）---
    # 传入 Part4 上半摘要（前2000字）保持一致性
    prompt_part4_lower = (
        f"请继续撰写命理师版报告 Part4 六领域深度分析的后3个领域。\n\n"
        f"{context_summary}\n\n"
        f"{PART4_DOMAIN_RULES}\n"
        f"前3个领域（婚姻/财富/事业）已完成，摘要供参考：\n"
        f"{result_part4_upper[:2000]}\n\n"
        f"请输出以下3个领域，每个领域包含 L1/L2/L3 三层：\n\n"
        f"### 4.4 健康·身体\n"
        f"（分析五行偏枯对健康的影响、易感部位、养生建议+时间窗口）\n\n"
        f"### 4.5 六亲·人际\n"
        f"（分析父母星/兄弟星/子女星的力量、六亲关系的命理底色）\n\n"
        f"### 4.6 自我·心性成长\n"
        f"（分析日主特质、性格优劣势、成长路径建议）\n"
    )
    result_part4_lower = await call_deepseek(judge_prompt, prompt_part4_lower)
    result_part4_lower = clean_ai_preamble(result_part4_lower)
    print(f"  ✅ Part4-下（健康+六亲+自我）: {len(result_part4_lower)} 字")

    # 拼接 Part4
    part4_combined = result_part4_upper.rstrip() + "\n\n" + result_part4_lower
    accumulated_report += "\n\n" + part4_combined

    total_chars = len(accumulated_report)
    print(f"  ✅ 命理师版总计: {total_chars} 字")
    return accumulated_report


# ============================================================
# Phase 5: 消费者版 - 3次分段调用
# ============================================================

async def generate_consumer_report(
    judge_prompt: str, skeleton: str, engine_summary: str, master_ai_insights: str
) -> str:
    """消费者版：3次分段调用 + 上下文摘要传递"""
    print("[5/8] AI 判读 - 消费者版（3段式）...")

    sections = split_consumer_skeleton(skeleton)
    header = sections.get("header", "")
    context_summary = build_context_summary(engine_summary, master_ai_insights)
    accumulated_consumer = header

    # --- 第1次：卷首 + 板块①（命书底牌） + 板块②（人格画像）---
    batch1_skeleton = "\n\n".join(filter(None, [
        sections.get("juanshou", ""),
        sections.get("bankuai1", ""),
        sections.get("bankuai2", ""),
    ]))
    prompt_batch1 = (
        f"请基于排盘数据，填充以下消费者版报告骨架（卷首 + 板块① + 板块②）。\n\n"
        f"{context_summary}\n\n"
        f"## 填充铁律\n"
        f"1. 每个【待填充：xxx】必须替换为对应判读（白话表达，给命主本人看）\n"
        f"2. 直接从骨架标题开始输出，不加AI角色回复\n"
        f"3. 保留骨架中已有的引擎数据\n"
        f"4. 所有判读必须与「核心事实摘要」保持一致\n\n"
        f"### 各占位符要求\n"
        f"- 【待填充：juanshou_sanjuhua】= 三句话讲完命主的命（精炼、有冲击力）\n"
        f"- 【待填充：wangshuai_consumer】= 旺衰白话解读\n"
        f"- 【待填充：yongshen_consumer】= 用神忌神白话解读\n"
        f"- 【待填充：geju_yijuhua】= 格局一句话概括\n"
        f"- 【待填充：renge_huaxiang】= 4维人格画像"
        f"（能量/思维/行动/情感维度，每维3-5句）\n\n"
        f"## 骨架\n\n{batch1_skeleton}"
    )
    result_batch1 = await call_deepseek(judge_prompt, prompt_batch1)
    result_batch1 = clean_ai_preamble(result_batch1)
    accumulated_consumer += "\n\n" + result_batch1
    print(f"  ✅ 卷首+板块①②: {len(result_batch1)} 字")

    # --- 第2次：板块③（六亲卡片）+ 板块④（领域卡片）---
    batch2_skeleton = "\n\n".join(filter(None, [
        sections.get("bankuai3", ""),
        sections.get("bankuai4", ""),
    ]))
    prompt_batch2 = (
        f"请基于排盘数据，填充以下消费者版报告骨架（板块③ + 板块④）。\n\n"
        f"{context_summary}\n\n"
        f"## 填充铁律\n"
        f"1. 每个【待填充：xxx】必须替换为对应判读（白话表达）\n"
        f"2. 直接从骨架标题开始输出，不加AI角色回复\n"
        f"3. 所有判读必须与「核心事实摘要」保持一致\n\n"
        f"### 六亲十神映射（铁律·必须严格遵守）\n"
        f"以下映射来自子平命理正统口诀，生成六亲卡片时**严禁搞错**：\n"
        f"- 父亲 = **偏财**（我克之同性）\n"
        f"- 母亲 = **正印**（生我之异性）。注意：偏印≠母亲，七杀≠母亲！\n"
        f"- 兄弟姐妹 = **比肩/劫财**（与我同五行）\n"
        f"- 配偶 = 男命**正财**，女命**正官**\n"
        f"- 子女 = 男命**七杀(子)/正官(女)**，女命**食神(女)/伤官(子)**\n"
        f"- 朋友/同事 = **比肩/劫财**\n"
        f"- 上司/贵人 = **正官/正印**\n\n"
        f"### 各占位符要求\n"
        f"- 【待填充：liuqin_kapian】= 6张六亲卡片"
        f"（父/母/配偶/子女/兄弟/朋友，每张含命理依据+白话+建议。"
        f"每张卡片必须先查对应十神在原局的位置和力量，严禁张冠李戴）\n"
        f"- 【待填充：lingyu_kapian】= 6张领域卡片"
        f"（婚姻/财富/事业/健康/学业/人际，每张含命理依据+白话+建议）\n\n"
        f"## 骨架\n\n{batch2_skeleton}"
    )
    result_batch2 = await call_deepseek(judge_prompt, prompt_batch2)
    result_batch2 = clean_ai_preamble(result_batch2)
    accumulated_consumer += "\n\n" + result_batch2
    print(f"  ✅ 板块③④: {len(result_batch2)} 字")

    # --- 第3次：板块⑤（时间指南）+ 卷尾 ---
    batch3_skeleton = "\n\n".join(filter(None, [
        sections.get("bankuai5", ""),
        sections.get("juanwei", ""),
    ]))
    current_year = datetime.now().year
    prompt_batch3 = (
        f"请基于排盘数据，填充以下消费者版报告骨架（板块⑤ + 卷尾）。\n\n"
        f"{context_summary}\n\n"
        f"## 填充铁律\n"
        f"1. 每个【待填充：xxx】必须替换为对应判读（白话表达）\n"
        f"2. 直接从骨架标题开始输出，不加AI角色回复\n"
        f"3. 所有判读必须与「核心事实摘要」保持一致\n\n"
        f"### 各占位符要求\n"
        f"- 【待填充：dangxia_consumer】= 当下定位白话版\n"
        f"- 【待填充：liunian_consumer】= 近3-5年流年逐年白话解读\n"
        f"- 【待填充：liuyue_consumer】= {current_year}年逐月白话指南\n"
        f"- 【待填充：sannian_qingdan】= 未来三年行动清单\n"
        f"- 【待填充：rensheng_siduan】= 人生四段论\n"
        f"- 【待填充：juanwei_xin】= 给命主的一封信（温暖、有力量）\n\n"
        f"## 骨架\n\n{batch3_skeleton}"
    )
    result_batch3 = await call_deepseek(judge_prompt, prompt_batch3)
    result_batch3 = clean_ai_preamble(result_batch3)
    accumulated_consumer += "\n\n" + result_batch3
    print(f"  ✅ 板块⑤+卷尾: {len(result_batch3)} 字")

    total_chars = len(accumulated_consumer)
    print(f"  ✅ 消费者版总计: {total_chars} 字")
    return accumulated_consumer


# ============================================================
# Phase 6: 微信版（一次调用，与旧版相同）
# ============================================================

async def generate_wechat_report(
    judge_prompt: str, skeleton: str, master_report: str
) -> str:
    """微信版：基于命理师版全文 + 优质案例范本一次生成"""
    print("[6/8] AI 判读 - 微信版...")
    example_wechat = ""
    example_path = EXAMPLES_PATH / "蔡命" / "蔡命-微信版.md"
    if example_path.exists():
        example_wechat = example_path.read_text(encoding="utf-8")

    wechat_prompt = (
        f"请基于以下命理师版报告，输出微信版命理报告。\n\n"
        f"## 微信版定义（来自 judge.md）\n\n"
        f"微信版·完整一段话（口语化、有温度、直接发给命主本人）。\n"
        f"结构：开头2段定调（日主+旺衰+核心红利+代价）→ 人生大势1段"
        f"（先难后易/大器晚成等战略级判断）→ "
        f"当前状态1段（大运+剩余年限+基调定性）→ "
        f"关键影响5-8条（原局底牌+大运+近3年命理信号，编号列表，"
        f"每条=术语+人话翻译+对命主具体影响）→ "
        f"流年预判（近2-3年逐年红绿灯信号）→ "
        f"趋利避害6-10条（可执行建议，编号列表，"
        f"每条=命理依据+具体行动+时间窗口，实操到骨头里）→ "
        f"收尾1段（温暖收尾，给信心）\n\n"
        f"## 风格铁律\n\n"
        f"1. 像资深命理师朋友在微信上跟你说话，不是客服\n"
        f"2. 命理术语+立刻翻译成人话（一句话里完成）\n"
        f"3. 比喻精准有力\n"
        f"4. 建议具体到骨头里\n"
        f"5. 数字有来源\n"
        f"6. 不用表格、不用 markdown 标记、不用标题\n"
        f"7. 所有事实必须与命理师版一致，不能无中生有\n\n"
        f"## 字数\n\n严格控制在 **1500-2000字**。\n\n"
        f"## 优质案例范本（写作风格标杆，事实不要照抄）\n\n"
        f"{example_wechat}\n\n"
        f"## 命理师版报告（事实来源）\n\n{master_report}\n\n"
        f"## 微信版模板参考\n\n{skeleton}"
    )
    wechat_report = await call_deepseek(judge_prompt, wechat_prompt)
    wechat_report = clean_wechat_report(wechat_report)
    print(f"  ✅ 微信版: {len(wechat_report)} 字")
    return wechat_report


# ============================================================
# 主流程
# ============================================================

async def main():
    parser = argparse.ArgumentParser(
        description="报告层标准能力：完整报告生成（v2 上下文摘要传递版）"
    )
    parser.add_argument("--name", required=True, help="命主姓名")
    parser.add_argument("--birth", required=True, help="出生时间 YYYY-MM-DD HH:MM")
    parser.add_argument("--gender", required=True, choices=["男", "女"])
    parser.add_argument("--output", required=True, help="输出目录")
    args = parser.parse_args()

    if not DEEPSEEK_API_KEY:
        print("❌ 请设置 DEEPSEEK_API_KEY 环境变量")
        sys.exit(1)

    output_dir = PROJECT_ROOT / args.output
    output_dir.mkdir(parents=True, exist_ok=True)

    # Phase 1-3: 排盘 → 规则 → 骨架
    paipan_data = run_paipan(args.name, args.birth, args.gender)
    rules_data = run_rules(paipan_data, gender=args.gender)
    skeletons = render_skeletons(args.name, args.gender, paipan_data, rules_data)

    with open(output_dir / "排盘数据.json", "w", encoding="utf-8") as f:
        json.dump(paipan_data, f, ensure_ascii=False, indent=2)

    # 构建基础设施
    judge_prompt = build_judge_prompt(paipan_data, rules_data, args.name, args.gender)
    engine_summary = extract_engine_summary(
        paipan_data, rules_data, args.name, args.gender
    )
    print(f"  📋 引擎事实摘要: {len(engine_summary)} 字")

    # Phase 4: 命理师版（5次分段调用）
    master_report = await generate_master_report(
        judge_prompt, skeletons["master"], engine_summary
    )

    # Phase 7: 提取命理师版最终洞察摘要，供消费者版使用
    print("[7/8] 提取命理师版洞察摘要...")
    master_final_insights = await generate_ai_insight_summary(
        judge_prompt, master_report[:8000]
    )
    print(f"  📋 最终洞察摘要: {len(master_final_insights)} 字")

    # Phase 5: 消费者版（3次分段调用）
    consumer_report = await generate_consumer_report(
        judge_prompt, skeletons["consumer"], engine_summary, master_final_insights
    )

    # Phase 6: 微信版（一次调用）
    wechat_report = await generate_wechat_report(
        judge_prompt, skeletons["wechat"], master_report
    )

    # Phase 8: 输出报告文件
    print("[8/8] 保存报告文件...")
    for report_type, content in [
        ("命理师版", master_report),
        ("消费者版", consumer_report),
        ("微信版", wechat_report),
    ]:
        filepath = output_dir / f"{report_type}.md"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  📄 {filepath.name}: {len(content)} 字")

    print("\n" + "=" * 60)
    print("✅ 完整报告生成完成！")
    print(f"📁 输出目录: {output_dir}")
    print(f"📊 API调用: 命理师版5次 + 摘要3次 + 消费者版3次 + 微信版1次 = 12次")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
