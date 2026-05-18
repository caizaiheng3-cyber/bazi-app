"""
报告层核心生成器（唯一真相源）

所有报告生成逻辑的单一入口。WEB层和CLI层都 import 本模块。
本模块不含 CLI 逻辑、不含数据库操作、不含 print 语句（用 callback 通知进度）。

公开接口：
    generate_reports(name, birth_str, gender, skip_consumer=True, on_progress=None)
        -> {"master": str, "consumer": str|None, "wechat": str,
            "paipan_json": dict, "rules_json": dict}
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

import httpx
from jinja2 import Environment, FileSystemLoader

# 路径设置
REPORT_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = REPORT_ROOT.parent
TEMPLATES_PATH = REPORT_ROOT / "templates"
PROMPTS_PATH = REPORT_ROOT / "prompts"
EXAMPLES_PATH = REPORT_ROOT / "examples"

# 将引擎加入 path
sys.path.insert(0, str(PROJECT_ROOT))
from engine.paipan import paipan as run_paipan_engine
from engine.rules import full_analysis

# API 配置
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")


# ============================================================
# 进度回调类型
# ============================================================

ProgressCallback = Optional[Callable[[str], None]]


def _noop_progress(msg: str):
    pass


# ============================================================
# Phase 1-3: 排盘 → 规则 → 骨架
# ============================================================

def compute_paipan(name: str, birth_str: str, gender: str,
                   birth_place: str = "未知",
                   calendar_type: str = "公历",
                   is_leap_month: bool = False,
                   use_true_solar_time: bool = None,
                   longitude: float = None) -> dict:
    """执行排盘计算，返回排盘 JSON

    Args:
        birth_place: 出生城市（用于真太阳时修正）
        calendar_type: "公历" 或 "农历"
        is_leap_month: 农历是否闰月（仅农历时有效）
        use_true_solar_time: 是否启用真太阳时。None 时自动判断：有出生地则启用。
        longitude: 经度（度）。None 时由引擎根据 birth_place 查表。
    """
    parts = birth_str.split(" ")
    date_parts = parts[0].split("-")
    time_parts = parts[1].split(":")
    year, month, day = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    hour, minute = int(time_parts[0]), int(time_parts[1])

    # 自动决定是否启用真太阳时：有出生地且非"未知"/空串时启用
    if use_true_solar_time is None:
        use_true_solar_time = bool(birth_place and birth_place not in ("未知", ""))

    return run_paipan_engine(year, month, day, hour, minute, gender,
                             birth_place=birth_place, name=name,
                             calendar_type=calendar_type,
                             is_leap_month=is_leap_month,
                             use_true_solar_time=use_true_solar_time,
                             longitude=longitude)


def compute_rules(paipan_data: dict, gender: str = "男") -> dict:
    """执行规则分析"""
    return full_analysis(paipan_data, gender=gender)


def render_skeletons(name: str, gender: str, paipan_data: dict, rules_data: dict) -> dict:
    """用 Jinja2 渲染报告骨架（含 AI_JUDGE 占位符）"""
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
        "name_short": f"{name}命",
        "gen_time": datetime.now().strftime("%Y-%m"),
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
    return skeletons


# ============================================================
# AI 调用基础设施
# ============================================================

async def call_deepseek(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 16384,
    temperature: float = 0.3,
) -> str:
    """调用 DeepSeek API（带 frequency_penalty 和重复字符清理）"""
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY 未配置，请设置环境变量")

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
    """清理 AI 输出中因重复生成导致的大量填充字符"""
    text = re.sub(r'([░▓█▒]{20})[░▓█▒]+', r'\1', text)
    text = re.sub(r'(.)\1{50,}', lambda m: m.group(1) * 20, text)
    return text


def validate_report_quality(master_report: str, wechat_report: str,
                            rules_data: dict = None) -> list:
    """
    报告质量校验（P4+P5）：
    - 检测占位文本泄漏
    - 检测事实矛盾（透干vs藏干、旺衰矛盾）
    - 检测用忌表达冲突
    - 检测时间线矛盾

    返回质量问题列表，空列表表示通过。
    """
    forbidden_patterns = [
        "待填充", "待分析", "待LLM", "待深化", "需AI判读",
        "AI_JUDGE", "{{ AI_JUDGE", "【待填充", "待LLM深化",
    ]
    issues = []
    for pattern in forbidden_patterns:
        if master_report and pattern in master_report:
            count = master_report.count(pattern)
            issues.append(f"命理师版含'{pattern}' x{count}")
        if wechat_report and pattern in wechat_report:
            count = wechat_report.count(pattern)
            issues.append(f"微信版含'{pattern}' x{count}")

    # P5: 一致性审查
    all_reports = (master_report or "") + "\n" + (wechat_report or "")

    if rules_data:
        wangshuai = rules_data.get("旺衰", {})
        ws_jielun = wangshuai.get("结论", "")

        # 旺衰矛盾检测：报告说"身旺"但引擎说"身弱"，或反之
        if ws_jielun == "身弱":
            if "身旺" in all_reports and "身弱" not in all_reports:
                issues.append("一致性：引擎判定身弱，但报告中出现'身旺'且无'身弱'")
            if "过旺" in all_reports:
                issues.append("一致性：引擎判定身弱，但报告中出现'过旺'")
        elif ws_jielun == "身旺":
            if "身弱" in all_reports and "身旺" not in all_reports:
                issues.append("一致性：引擎判定身旺，但报告中出现'身弱'且无'身旺'")

        # 透藏矛盾检测：检查"财星透出"但实际无财星透干
        yongshen = rules_data.get("用神忌神", {})
        shishen_dist = rules_data.get("十神分布", {}).get("分布", {})

        # 检查财星是否透干
        zhengcai_tou = shishen_dist.get("正财", {}).get("透干", [])
        piancai_tou = shishen_dist.get("偏财", {}).get("透干", [])
        if not zhengcai_tou and not piancai_tou:
            if "财星透出" in all_reports or "财透" in all_reports:
                issues.append("事实矛盾：报告写'财星透出'，但引擎数据显示财星无透干")

        # 检查正官是否透干
        zhengguan_tou = shishen_dist.get("正官", {}).get("透干", [])
        zhengguan_li = shishen_dist.get("正官", {}).get("力量", 0)
        if not zhengguan_tou:
            if "正官透出" in all_reports or "夫星透出" in all_reports:
                issues.append("事实矛盾：报告写'正官/夫星透出'，但引擎数据显示正官无透干")
        if zhengguan_li <= 5:
            if "夫星有力" in all_reports or "正官有力" in all_reports:
                issues.append(f"事实矛盾：报告写'夫星/正官有力'，但引擎数据力量仅{zhengguan_li}")

    # 用忌未解释矛盾检测
    wuxing_list = ["木", "火", "土", "金", "水"]
    for wx in wuxing_list:
        is_yongshen_claim = f"{wx}是用神" in all_reports or f"{wx}为用神" in all_reports
        is_jishen_claim = f"{wx}是忌神" in all_reports or f"{wx}为忌神" in all_reports
        has_condition = ("条件" in all_reports and wx in all_reports) or f"{wx}可用但" in all_reports
        if is_yongshen_claim and is_jishen_claim and not has_condition:
            issues.append(f"用忌矛盾：{wx}同时被称为用神和忌神，但无条件解释")

    return issues


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
# 上下文摘要系统
# ============================================================

def extract_engine_summary(paipan_data: dict, rules_data: dict, name: str, gender: str) -> str:
    """从引擎数据中规则提取核心事实摘要（确定性数据，不依赖AI）"""
    current_year = datetime.now().year
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

    # 日常策略（引擎仲裁后的最终结论）
    daily_strategy = yongshen.get("日常策略", {})
    main_strategy = daily_strategy.get("主策略", "")
    wuxing_guide = daily_strategy.get("五行指导", {})
    strategy_lines = ""
    if wuxing_guide:
        strategy_lines = "\n### 日常五行策略（引擎最终裁决，报告必须与此一致）\n\n"
        strategy_lines += f"**主策略**：{main_strategy}\n"
        for wx, info in wuxing_guide.items():
            strategy_lines += f"- **{wx}**（{info.get('十神', '')}）：{info['定性']} → {info['策略']}\n"
        strategy_lines += (
            "\n**铁律**：报告中提及五行用忌时，必须与以上策略一致。"
            "同一五行既是用神又是忌神时，必须输出条件解释，"
            "严禁出现'X是忌神'和'X是用神'的未解释矛盾。\n"
        )

    # 事实约束：透干vs藏干
    sizhu_facts = ""
    for pos in ["年柱", "月柱", "日柱", "时柱"]:
        tiangan = sizhu[pos]["天干"]
        tiangan_shishen = sizhu[pos].get("天干十神", "")
        canggan = sizhu[pos].get("藏干", [])
        canggan_str = "/".join(f"{c['天干']}({c['十神']})" for c in canggan)
        sizhu_facts += f"- {pos}：天干{tiangan}({tiangan_shishen})透出，藏干={canggan_str}\n"

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
        f"### 四柱透藏事实（严禁混淆透干与藏干）\n\n"
        f"{sizhu_facts}\n"
        f"**铁律**：只有天干才叫'透出'，藏干不能说'透出'。"
        f"'有力'需看力量值，力量≤5为微弱，≤10为较弱。\n"
        f"{strategy_lines}"
    )


async def generate_ai_insight_summary(judge_prompt: str, generated_text: str) -> str:
    """让 AI 从已生成的报告中提取洞察性结论摘要"""
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
    """合并引擎摘要和AI洞察摘要为完整的上下文摘要"""
    return (
        f"{engine_summary}\n"
        f"### AI 判读洞察（来自已生成的报告章节）\n\n"
        f"{ai_insights}\n"
    )


def build_judge_prompt(paipan_data: dict, rules_data: dict, name: str, gender: str) -> str:
    """构建 AI 判读的系统 prompt"""
    judge_prompt = (PROMPTS_PATH / "judge.md").read_text(encoding="utf-8")
    current_year = datetime.now().year
    dayun_info = paipan_data.get("大运", {})
    dayun_list = dayun_info.get("大运列表", []) if isinstance(dayun_info, dict) else []
    birth_str = paipan_data.get("命主信息", {}).get("出生公历", "")
    year_match = re.search(r"(\d{4})年", birth_str)
    birth_year = int(year_match.group(1)) if year_match else 1990
    current_age = current_year - birth_year + 1

    current_dayun = None
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


# ============================================================
# 命理师版生成（5次分段调用）
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
    judge_prompt: str, skeleton: str, engine_summary: str,
    on_progress: ProgressCallback = None,
) -> str:
    """命理师版：5次分段调用 + 上下文摘要传递"""
    progress = on_progress or _noop_progress
    progress("命理师版生成中：Part0+1")

    skeleton_parts = split_master_skeleton(skeleton)
    header = skeleton_parts.get("header", "")
    accumulated_report = header
    context_summary = engine_summary
    ai_insights = ""

    # --- 第1次：Part0 + Part1 ---
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

    # 生成 AI 洞察摘要
    ai_insights = await generate_ai_insight_summary(judge_prompt, result_part01)
    context_summary = build_context_summary(engine_summary, ai_insights)

    # --- 第2次：Part2 ---
    progress("命理师版生成中：Part2")
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

    # --- 第3次：Part3 ---
    progress("命理师版生成中：Part3")
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
        f"### 时间线分层铁律\n"
        f"- 不同大运阶段必须使用不同的定性名称，严禁多个阶段都叫'主升浪'\n"
        f"- 推荐分层命名：蓄力期 → 启动期 → 加速期 → 稳定期 → 收获期\n"
        f"- 每个阶段的核心命题不同：如'蓄力期=充电学习'、'启动期=变现试水'、'稳定期=身份确立'\n"
        f"- 如果有多个上升段，必须区分：如'才华变现启动期(2029-2038)'vs'身份事业稳定期(2039-2048)'\n\n"
        f"## 骨架\n\n{part3_skeleton}"
    )
    result_part3 = await call_deepseek(judge_prompt, prompt_part3)
    result_part3 = clean_ai_preamble(result_part3)
    accumulated_report += "\n\n" + result_part3

    # 更新洞察摘要
    liunian_insight = await generate_ai_insight_summary(judge_prompt, result_part3)
    ai_insights += "\n" + liunian_insight
    context_summary = build_context_summary(engine_summary, ai_insights)

    # --- 第4次：Part4（确定性领域画像 + LLM润色展开）---
    progress("命理师版生成中：Part4")
    part4_skeleton = skeleton_parts.get("part4", "")
    prompt_part4 = (
        f"请基于以下已由引擎确定的四大领域画像骨架，为每个领域补充 L1/L2/L3 三层深度展开。\n\n"
        f"{context_summary}\n\n"
        f"## Part4 填充铁律\n"
        f"1. 骨架中的**核心结论、吉凶定性、关键证据、优势/风险信号、关键年份、行动建议**"
        f"是引擎的确定性输出，**绝对禁止修改、删除或与之矛盾**\n"
        f"2. 你的任务是在每个领域标题之后、骨架数据之间，插入三层分析：\n"
        f"   - L1 事实层：用命理术语解释骨架中的证据为什么成立\n"
        f"   - L2 影响层：翻译成人话，对命主生活的具体影响\n"
        f"   - L3 趋利避害：可执行建议 + 时间窗口（必须与骨架行动建议一致）\n"
        f"3. 每个领域展开不少于600字，四大领域总计不少于2500字\n"
        f"4. 直接从骨架标题开始输出，保留骨架中所有原有内容（表格、列表等）\n"
        f"5. 如果骨架有 AI_JUDGE.liulingyu 占位符，填充为六领域总结性卷首语\n\n"
        f"## 骨架\n\n{part4_skeleton}"
    )
    result_part4 = await call_deepseek(judge_prompt, prompt_part4)
    result_part4 = clean_ai_preamble(result_part4)
    accumulated_report += "\n\n" + result_part4

    progress(f"命理师版完成：{len(accumulated_report)} 字")
    return accumulated_report


# ============================================================
# 消费者版生成（两次调用）
# ============================================================

async def generate_consumer_report(
    judge_prompt: str, skeleton: str, master_report: str,
    rules_data: dict = None, paipan_data: dict = None,
    on_progress: ProgressCallback = None,
) -> str:
    """消费者版：基于命理师版+骨架，分两次调用生成
    
    Args:
        rules_data: 规则分析数据（用于注入引擎原始旺衰数据）
        paipan_data: 排盘原始数据（用于注入引擎原始五行数据）
    """
    progress = on_progress or _noop_progress
    progress("精读决策版生成中：板块1-4")

    # 构建引擎事实摘要
    engine_summary_text = ""
    if rules_data and paipan_data:
        engine_summary_text = extract_engine_summary(
            paipan_data, rules_data,
            paipan_data.get("命主信息", {}).get("姓名", "命主"),
            paipan_data.get("命主信息", {}).get("性别", "未知"),
        )

    current_year = datetime.now().year

    # 第1次调用：板块1-4（核心判决 + 底层模型 + 三年决策 + 事业决策）
    prompt_part1 = (
        f"你是一位顶级命理策略顾问。请基于命理师版报告，输出精读决策版的前4个板块。\n\n"
        f"{engine_summary_text}\n\n"
        f"## 精读决策版定位\n\n"
        f"这是一份**付费决策报告**，不是白话命书。\n"
        f"目标：让用户觉得'这份报告能指导我做决定'。\n"
        f"每个判断必须落到：该做什么 / 不该做什么 / 时间窗口 / 风险边界。\n"
        f"禁止泛泛讲命理术语。禁止'注意健康''把握机会'等空话。\n\n"
        f"## 输出格式（严格按以下结构，用 markdown 二级标题分隔）\n\n"
        f"## 一、核心判决\n\n"
        f"要求：\n"
        f"- 一句话定命（像标语一样记忆深刻，如'低电量高才华型'）\n"
        f"- 三个关键词概括此人\n"
        f"- 当前人生阶段一句话定性（如'蓄力期第3年'）\n"
        f"- 不超过200字\n\n"
        f"## 二、命主底层模型\n\n"
        f"要求：\n"
        f"- 不讲术语，讲'这个人怎么运转'\n"
        f"- 用比喻或模型概括（如：充电宝型人格、高输出低续航、才华输出>承载力）\n"
        f"- 讲清楚：天赋在哪、卡点在哪、能量从哪来、会从哪漏\n"
        f"- 300-500字\n\n"
        f"## 三、当前三年决策地图\n\n"
        f"要求：\n"
        f"- 逐年（{current_year}/{current_year+1}/{current_year+2}）给出：\n"
        f"  - 本年主题（一句话）\n"
        f"  - 该做什么（3条具体行动）\n"
        f"  - 不该做什么（3条红线）\n"
        f"  - 最大风险\n"
        f"  - 最佳投入方向\n"
        f"- 每年300-400字\n\n"
        f"## 四、事业决策\n\n"
        f"要求：\n"
        f"- 适合什么类型的工作环境/岗位/节奏\n"
        f"- 不适合什么（具体到场景）\n"
        f"- 跳槽/创业/考证/平台/副业 各给一句决策建议\n"
        f"- 当前阶段的事业策略（时间窗口+行动）\n"
        f"- 500-700字\n\n"
        f"## 铁律\n"
        f"1. 所有事实必须基于命理师版报告，不得编造\n"
        f"2. 每条建议必须有命理依据支撑（但不堆术语，一句话带过）\n"
        f"3. 禁止输出'待分析'、'待填充'\n"
        f"4. 直接输出内容，不要加角色寒暄\n\n"
        f"## 命理师版报告（事实来源）\n\n{master_report[:8000]}"
    )
    result_part1 = await call_deepseek(judge_prompt, prompt_part1)
    result_part1 = clean_ai_preamble(result_part1)

    progress("精读决策版生成中：板块5-8")

    # 第2次调用：板块5-8（财富 + 感情 + 健康 + 行动清单）
    prompt_part2 = (
        f"继续输出精读决策版的后4个板块。\n\n"
        f"{engine_summary_text}\n\n"
        f"## 输出格式（严格按以下结构）\n\n"
        f"## 五、财富决策\n\n"
        f"要求：\n"
        f"- 钱从哪里来（正财/偏财/哪种赚钱模式适合）\n"
        f"- 钱会从哪里漏（花钱习惯/人情/合伙/投资风险）\n"
        f"- 能不能合伙（具体条件）\n"
        f"- 能不能投资（具体边界）\n"
        f"- 当前三年的财务策略\n"
        f"- 500-700字\n\n"
        f"## 六、感情决策\n\n"
        f"要求：\n"
        f"- 正缘节奏（什么时候容易遇到/确认关系）\n"
        f"- 择偶标准（什么类型适合，什么类型踩雷）\n"
        f"- 关系中的雷区（哪些模式容易出问题）\n"
        f"- 关键年份标注\n"
        f"- 400-600字\n\n"
        f"## 七、健康与能量管理\n\n"
        f"要求：\n"
        f"- 不是养生泛话，是'命主使用说明书'\n"
        f"- 哪些器官/系统容易出问题\n"
        f"- 能量补充方式（适合什么运动/作息/环境）\n"
        f"- 能量消耗警报（什么行为/环境会快速耗电）\n"
        f"- 300-500字\n\n"
        f"## 八、行动清单\n\n"
        f"要求：\n"
        f"- 30天行动（立刻能做的3-5件事）\n"
        f"- 90天行动（本季度重点方向）\n"
        f"- 1年行动（今年的核心目标）\n"
        f"- 3年行动（中期战略方向）\n"
        f"- 每条行动必须具体到可执行（不是'注意健康'而是'每周三次30分钟慢跑'）\n"
        f"- 这是全报告的收尾，是付费感最强的部分\n\n"
        f"## 铁律\n"
        f"1. 所有事实必须基于命理师版报告\n"
        f"2. 每条建议有命理依据（简短带过）\n"
        f"3. 禁止输出'待分析'、'待填充'\n"
        f"4. 直接输出内容，不要加角色寒暄\n\n"
        f"## 命理师版报告（事实来源）\n\n{master_report[4000:12000]}\n\n"
        f"## 前半部分已生成内容（保持一致性）\n\n{result_part1[:4000]}"
    )
    result_part2 = await call_deepseek(judge_prompt, prompt_part2)
    result_part2 = clean_ai_preamble(result_part2)

    # 拼接
    full_consumer = result_part1.rstrip() + "\n\n" + result_part2
    progress(f"精读决策版完成：{len(full_consumer)} 字")
    return full_consumer


# ============================================================
# 微信版生成（一次调用）
# ============================================================

async def generate_wechat_report(
    judge_prompt: str, skeleton: str, master_report: str,
    on_progress: ProgressCallback = None,
) -> str:
    """微信版：基于命理师版全文一次生成"""
    progress = on_progress or _noop_progress
    progress("微信版生成中")

    example_wechat = ""
    example_path = EXAMPLES_PATH / "蔡命" / "蔡命-微信版.md"
    if example_path.exists():
        example_wechat = example_path.read_text(encoding="utf-8")

    wechat_prompt = (
        f"请基于命理师版报告，写一段微信消息发给命主本人。\n\n"
        f"## 你是谁\n\n"
        f"你是一个真正懂命理的朋友，看完对方的盘，直接告诉对方最重要的事。\n\n"
        f"## 写法（照着案例的节奏写）\n\n"
        f"第一段：直接说命是什么（日主五行+旺衰+核心特征），两三句话把人的底色讲透。\n"
        f"第二段：说最大的红利或最核心的人生节奏（先难后易/大器晚成/某个年龄后起飞等）。\n"
        f"第三段：说当前大运状态（走什么运、还剩几年、基调是什么）。\n"
        f"然后用编号列表说5-8条对命主影响最大的事，每条格式：\n"
        f"  编号、命理事实（术语）——翻译成人话——对命主的具体影响。\n"
        f"再用'接下来是我给你的建议'过渡，给5-7条具体建议，每条：\n"
        f"  编号、建议标题+具体到骨头里的行动（时间窗口/方位/择偶标准/运动方式等）。\n"
        f"最后一段收尾，给信心但不鸡汤。\n\n"
        f"## 风格铁律\n\n"
        f"- 口语化、直接、有力，像朋友在微信上跟你聊\n"
        f"- 命理术语说出来就立刻翻译成人话（同一句话里完成）\n"
        f"- 每条建议必须具体到可执行（不是'注意健康'而是'每周三次出汗运动'）\n"
        f"- 数字有来源（力量值、年龄、年份）\n"
        f"- 所有事实必须与命理师版一致，不能编造\n\n"
        f"## 绝对禁止\n\n"
        f"- 标题（#）、表格、加粗、分隔线\n"
        f"- '权重'、'维度'、'P0'、'条件用神' 等产品/专业堆砌\n"
        f"- 开头写'我看完你的盘'这种套路（直接开讲命是什么）\n"
        f"- 超过 2000 字\n\n"
        f"## 字数：1500-2000字\n\n"
        f"## 案例范本（严格模仿这个风格和节奏，事实用命理师版的）\n\n"
        f"{example_wechat}\n\n"
        f"## 命理师版报告（事实来源，从中提取关键信息）\n\n{master_report}"
    )
    wechat_report = await call_deepseek(judge_prompt, wechat_prompt)
    wechat_report = clean_wechat_report(wechat_report)
    progress(f"微信版完成：{len(wechat_report)} 字")
    return wechat_report


# ============================================================
# 顶层公开接口
# ============================================================

async def generate_reports(
    name: str,
    birth_str: str,
    gender: str,
    birth_place: str = "未知",
    calendar_type: str = "公历",
    is_leap_month: bool = False,
    skip_consumer: bool = True,
    on_progress: ProgressCallback = None,
) -> dict:
    """
    报告生成的唯一公开接口。

    参数:
        name: 命主姓名
        birth_str: 出生时间 "YYYY-MM-DD HH:MM"
        gender: "男" 或 "女"
        birth_place: 出生城市（用于真太阳时修正）
        calendar_type: "公历" 或 "农历"
        is_leap_month: 农历是否闰月
        skip_consumer: 是否跳过消费者版生成（WEB层默认跳过）
        on_progress: 进度回调函数，接受一个字符串参数

    返回:
        {
            "master": str,          # 命理师版报告
            "consumer": str|None,   # 消费者版报告（skip_consumer=True时为None）
            "wechat": str,          # 微信版报告
            "paipan_json": dict,    # 排盘原始数据
            "rules_json": dict,     # 规则分析数据
        }
    """
    progress = on_progress or _noop_progress

    # Phase 1: 排盘
    progress("排盘计算中")
    paipan_data = compute_paipan(name, birth_str, gender,
                                 birth_place=birth_place,
                                 calendar_type=calendar_type,
                                 is_leap_month=is_leap_month)

    # Phase 2: 规则分析
    progress("规则分析中")
    rules_data = compute_rules(paipan_data, gender=gender)

    # Phase 3: 骨架渲染
    progress("模板渲染中")
    skeletons = render_skeletons(name, gender, paipan_data, rules_data)

    # 构建基础设施
    judge_prompt = build_judge_prompt(paipan_data, rules_data, name, gender)
    engine_summary = extract_engine_summary(paipan_data, rules_data, name, gender)

    # Phase 4: 命理师版
    progress("AI判读中：命理师版")
    master_report = await generate_master_report(
        judge_prompt, skeletons["master"], engine_summary, on_progress
    )

    # Phase 5: 消费者版（可跳过）
    consumer_report = None
    if not skip_consumer:
        progress("AI判读中：消费者版")
        consumer_report = await generate_consumer_report(
            judge_prompt, skeletons["consumer"], master_report,
            rules_data=rules_data, paipan_data=paipan_data,
            on_progress=on_progress,
        )

    # Phase 6: 微信版
    progress("AI判读中：微信版")
    wechat_report = await generate_wechat_report(
        judge_prompt, skeletons["wechat"], master_report, on_progress
    )

    # Phase 7: 报告质量校验（P4+P5：占位文本 + 一致性审查）
    progress("质量校验中")
    quality_issues = validate_report_quality(master_report, wechat_report, rules_data=rules_data)
    if quality_issues:
        progress(f"⚠️ 质量问题：{len(quality_issues)}处 → {'; '.join(quality_issues[:3])}")

    progress("报告生成完成")
    return {
        "master": master_report,
        "consumer": consumer_report,
        "wechat": wechat_report,
        "paipan_json": paipan_data,
        "rules_json": rules_data,
        "quality_issues": quality_issues,
        "quality_passed": len(quality_issues) == 0,
    }
